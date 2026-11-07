# Desarrollo local con infraestructura en el homelab

> **Estado:** propuesta cerrada, pendiente de ejecución.
> **Alcance:** solo desarrollo local. Producción (Heroku + Vercel + Neon +
> Upstash) no se modifica.
> **Decisión:** Opción A — la infraestructura vive en el homelab; backend y
> frontend siguen ejecutándose en la PC de desarrollo.

---

## 1. Objetivo

Eliminar Docker de la PC de desarrollo sin perder la comodidad de un entorno
local reproducible:

- PostgreSQL: nativo en Debian, reutilizando el clúster 17 existente.
- Redis: contenedor Docker en Debian, levantado y detenido manualmente.
- Backend Spring Boot: sigue en la PC, con un perfil nuevo.
- Frontend Vite: sigue en la PC, sin cambios.
- Un solo túnel SSH y una sola unidad systemd, ampliando el túnel actual.
- Sin contenedor PostgreSQL duplicado y sin Docker local.

---

## 2. Decisiones cerradas

| Tema | Decisión |
|---|---|
| PostgreSQL | Nativo Debian 17.11, DB `fac_med_db` |
| Rol de base de datos | `sfm_dev`, independiente y sin superusuario |
| Redis | Contenedor Docker `redis:7-alpine` en Debian |
| Túnel | Ampliar el `postgresql-tunnel.service` actual con Redis |
| Perfil Spring | Nuevo `dev-homelab` |
| Docker local | Eliminado; no habrá fallback local |
| Datos | Seeds de Flyway + importar solo vectores CIE-10 desde Neon |
| Parada | Manual; Redis se detiene, PostgreSQL sigue compartido |
| Producción | Intacta |

### Estado de implementación — 2026-11-07

| Paso | Estado |
|---|---|
| PostgreSQL 17 + pgvector 0.8.0 | Hecho |
| DB `fac_med_db` + rol `sfm_dev` | Hecho |
| Extensiones en `fac_med_db` | Hecho |
| Superuser temporal para Flyway | Hecho y revertido |
| Redis Docker + volumen | Hecho |
| Túnel con PostgreSQL + Redis | Hecho |
| Perfil `dev-homelab` | Hecho |
| Flyway V1–V11 + seeds | Hecho |
| Vectores CIE-10 (14.208) | Hecho |
| Arranque normal + health/login/P1 | Validado |
| Limpieza de Docker local | Hecho |
| Documentación de README/backend | Hecho |
| Perfil Maven sin Docker | Hecho (`-Punit`) |

---

## 3. Arquitectura

```text
┌──────────────── Arch Linux — desarrollo ────────────────┐
│                                                          │
│  Spring Boot :8080  ── perfil dev-homelab               │
│  Vite :5173                                             │
│                                                          │
│  127.0.0.1:15432 ──┐                                    │
│  127.0.0.1:6379  ──┤                                    │
│                    │  autossh + ssh                      │
└────────────────────┼────────────────────────────────────┘
                     │
                     ▼
┌──────────────── Debian homelab ──────────────────────────┐
│                                                          │
│  PostgreSQL 17 nativo :5432                              │
│    └── fac_med_db  (owner: sfm_dev)                      │
│                                                          │
│  Docker: sfm-dev-redis :6379                             │
│    └── solo accesible en 127.0.0.1                       │
│                                                          │
│  Túnel SSH: 15432 → 5432  y  6379 → 6379                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Puertos

| Servicio | En Debian | En Arch (túnel) |
|---|---:|---:|
| PostgreSQL | `127.0.0.1:5432` | `127.0.0.1:15432` |
| Redis | `127.0.0.1:6379` | `127.0.0.1:6379` |
| Backend | — | `localhost:8080` |
| Frontend | — | `localhost:5173` |

---

## 4. Fase 1 — PostgreSQL nativo

### 4.1 Instalar pgvector

Debian 13 ya trae `uuid-ossp`, `pgcrypto` y `btree_gist` dentro del paquete
`postgresql-17`. Solo falta pgvector.

```bash
sudo apt update
sudo apt install -y postgresql-17-pgvector
```

> `vector.control` **no** está marcado como `trusted`. Por eso la extensión
> `vector` debe crearla el superusuario `postgres` antes de que Flyway la
> intente crear.

### 4.2 Crear rol, base y extensiones

Ejecutar en el servidor. La contraseña se define de forma interactiva con
`\password` para no dejarla en el historial de shell.

```bash
sudo -u postgres psql
```

Dentro de `psql`:

```sql
-- Verificar que fac_med_db no exista
SELECT 1 FROM pg_database WHERE datname = 'fac_med_db';

CREATE ROLE sfm_dev LOGIN;
\password sfm_dev

CREATE DATABASE fac_med_db OWNER sfm_dev;

\c fac_med_db

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS vector;

\dx
\q
```

Si `fac_med_db` ya existe, **detenerse** y revisar antes de continuar.

### 4.3 Verificar autenticación TCP

El túnel actual ya funciona contra `127.0.0.1:5432`, así que `pg_hba.conf`
debería aceptar conexiones TCP locales. Verificar sin modificar nada:

```bash
HBA=$(sudo -u postgres psql -tAc "show hba_file")
sudo grep -E "^(local|host)" "$HBA"
```

Debe existir una regla para `127.0.0.1/32` con `scram-sha-256` (o el método
que ya esté usando el proyecto existente). No cambiar el archivo sin plan.

### 4.4 Verificar desde Arch

```bash
psql -h 127.0.0.1 -p 15432 -U sfm_dev -d fac_med_db \
  -c "SELECT current_user, current_database();"
```

Resultado esperado: `sfm_dev | fac_med_db`.

### 4.5 Propiedad de las extensiones (validado)

Flyway ejecuta `CREATE EXTENSION IF NOT EXISTS` en V1, V4 y V10. En PostgreSQL
esto **no** es suficiente con que la extensión exista: el usuario de migración
también debe ser dueño de la extensión. El primer intento falló con:

```text
ERROR: debe ser dueño de la extensión uuid-ossp
```

`ALTER EXTENSION ... OWNER TO` no existe en PostgreSQL, y
`REASSIGN OWNED BY postgres TO sfm_dev` falla porque `postgres` posee objetos
requeridos por el sistema.

La solución aplicada fue:

1. Dar a `sfm_dev` el rol `SUPERUSER` temporalmente.
2. Correr Flyway (V1–V11).
3. Quitar el `SUPERUSER` inmediatamente después.

```sql
-- Antes del primer Flyway
ALTER ROLE sfm_dev SUPERUSER;

-- Después de que Flyway termine y la app haya arrancado
ALTER ROLE sfm_dev NOSUPERUSER;
```

Las tablas y secuencias quedan con owner `sfm_dev`; las extensiones siguen
siendo propiedad de `postgres`, pero ya no se vuelven a crear porque las
migraciones V1/V4/V10 quedan registradas como aplicadas.

Si en el futuro se agrega una migración que cree otra extensión, habrá que
repetir el procedimiento temporal o usar un rol de migración separado.

---

## 5. Fase 2 — Redis en Docker

### 5.1 Archivo `infra/dev-homelab/compose.yml`

```yaml
name: sfm-dev

services:
  redis:
    image: redis:7-alpine
    container_name: sfm-dev-redis
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - sfm_dev_redis_data:/data
    restart: "no"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  sfm_dev_redis_data:
```

Notas:

- Solo Redis; no hay PostgreSQL en Docker.
- `restart: "no"` para que no arranque solo al bootear Debian.
- Sin password: el puerto está en loopback y el acceso desde Arch es por SSH.
- El volumen conserva el estado entre `stop`/`start`; no es crítico porque
  Redis solo guarda caché y blacklist de JWT en desarrollo.

### 5.2 Ubicación en Debian

Copiar el compose a una ruta estable, por ejemplo:

```text
/home/felipep/sfm-dev/compose.yml
```

Desde Arch:

```bash
ssh ssh.fepdev.app "mkdir -p ~/sfm-dev"
scp infra/dev-homelab/compose.yml ssh.fepdev.app:~/sfm-dev/compose.yml
```

El usuario `felipep` ya está en el grupo `docker` en Debian, así que no hace
falta `sudo`.

### 5.3 Uso manual

```bash
# Arrancar Redis
ssh ssh.fepdev.app "cd ~/sfm-dev && docker compose up -d"

# Estado
ssh ssh.fepdev.app "cd ~/sfm-dev && docker compose ps"

# Detener Redis (conserva el volumen)
ssh ssh.fepdev.app "cd ~/sfm-dev && docker compose stop"
```

Verificación:

```bash
ssh ssh.fepdev.app "docker exec sfm-dev-redis redis-cli ping"
```

Debe responder `PONG`.

---

## 6. Fase 3 — Ampliar el túnel existente

Se mantiene **una sola unidad** y **una sola conexión SSH**. Se agrega el
forward de Redis al `postgresql-tunnel.service` que ya existe.

### 6.1 Override de systemd

```bash
systemctl --user edit postgresql-tunnel.service
```

Contenido del override:

```ini
[Service]
ExecStart=
ExecStart=/usr/bin/autossh -M 0 -N -T \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes \
  -L 127.0.0.1:15432:127.0.0.1:5432 \
  -L 127.0.0.1:6379:127.0.0.1:6379 \
  ssh.fepdev.app
```

Aplicar:

```bash
systemctl --user daemon-reload
systemctl --user restart postgresql-tunnel.service
```

> El reinicio corta brevemente el forward de `15432`. Es esperable; el backend
> y `psql` reconectan. No se crea una segunda unidad.

### 6.2 Verificar

```bash
systemctl --user status postgresql-tunnel.service --no-pager
ss -ltn | grep -E "15432|6379"
```

Deben aparecer ambos puertos en `127.0.0.1`.

---

## 7. Fase 4 — Perfil Spring `dev-homelab`

### 7.1 Archivo `backend/src/main/resources/application-dev-homelab.yml`

```yaml
spring:
  config:
    import: optional:file:../.env[.properties]

  datasource:
    url: jdbc:postgresql://127.0.0.1:15432/fac_med_db
    username: ${DB_USER:sfm_dev}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 5
      minimum-idle: 2
      connection-timeout: 30000
      pool-name: HikariPool-SFM-Homelab

  jpa:
    show-sql: false
    properties:
      hibernate:
        "[format_sql]": false

  flyway:
    locations: classpath:db/migration,classpath:db/seeds

  data:
    redis:
      host: 127.0.0.1
      port: 6379

logging:
  level:
    com.fepdev.sfm: DEBUG
    org.springframework.security: DEBUG
    org.flywaydb: INFO
```

La configuración de Spring AI se hereda de `application.yml`; las claves se
resuelven desde el `.env` importado.

### 7.2 Variables locales

Agregar al `.env` de la raíz (no versionado):

```properties
DB_USER=sfm_dev
DB_PASSWORD=<password-de-sfm_dev>
```

Mantener:

```properties
GOOGLE_API_KEY=...
ANTHROPIC_API_KEY=...
```

Crear `.env.example` con nombres, sin valores reales.

### 7.3 Ejecutar el backend

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev-homelab
```

No se necesita Docker local.

### 7.4 Frontend

Sin cambios:

```bash
cd frontend
npm run dev
```

El frontend sigue apuntando a `http://localhost:8080/api/v1`.

---

## 8. Fase 5 — Esquema, seeds y vectores

### 8.1 Evitar la indexación automática durante la primera migración

Agregar a `Icd10DataLoader` una condición para poder desactivar la carga en
el arranque:

```java
@ConditionalOnProperty(
    name = "app.ai.icd10.index-on-startup",
    havingValue = "true",
    matchIfMissing = true
)
@Component
public class Icd10DataLoader {
    // ...
}
```

- `matchIfMissing = true` mantiene el comportamiento actual en producción.
- Solo se desactiva en el arranque inicial de desarrollo.

### 8.2 Primer arranque controlado

Crear el esquema y los seeds sin indexar CIE-10:

```bash
cd backend
./mvnw spring-boot:run \
  -Dspring-boot.run.profiles=dev-homelab \
  -Dspring-boot.run.arguments=--app.ai.icd10.index-on-startup=false
```

Cuando Flyway termine y la app arranque, detener el backend.

Verificar:

```bash
psql -h 127.0.0.1 -p 15432 -U sfm_dev -d fac_med_db \
  -c "SELECT version, description FROM flyway_schema_history ORDER BY installed_rank;"
```

Debe mostrar V1–V11 aplicadas.

### 8.3 Importar solo los vectores CIE-10 desde Neon

No importar todo `vector_store`: esa tabla también contiene embeddings de
historias clínicas de producción, y esos registros no existen en la base de
desarrollo. Si se importan, P3 podría citar expedientes inexistentes.

Importar únicamente las filas con `metadata->>'code'` usando `\copy`
(`pg_dump --where` no está disponible en todas las versiones de `pg_dump`):

```bash
export NEON_URL="postgresql://...?sslmode=require"
export LOCAL_URL="postgresql://sfm_dev:<password>@127.0.0.1:15432/fac_med_db"

# Exportar solo los vectores CIE-10 desde Neon
psql "$NEON_URL" -v ON_ERROR_STOP=1 -c "
  \\copy (
    SELECT * FROM vector_store WHERE metadata->>'code' IS NOT NULL
  ) TO '/tmp/vector_store_icd10.csv' WITH (FORMAT csv)
"

# Importar en la base de desarrollo
psql "$LOCAL_URL" -v ON_ERROR_STOP=1 -c "
  \\copy vector_store FROM '/tmp/vector_store_icd10.csv' WITH (FORMAT csv)
"

rm -f /tmp/vector_store_icd10.csv
```

Verificar:

```sql
SELECT count(*) AS total,
       count(DISTINCT metadata->>'code') AS codigos
FROM vector_store
WHERE metadata->>'code' IS NOT NULL;
```

Esperado: `14208 | 14208`.

Si el `--where` no funcionara por la versión del cliente, importar todo y
luego borrar las filas sin código:

```sql
DELETE FROM vector_store WHERE metadata->>'code' IS NULL;
ANALYZE vector_store;
```

### 8.4 Arranque normal

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev-homelab
```

`Icd10DataLoader` debe registrar:

```text
CIE-10 ya indexado en el vector store (14208 códigos) — omitiendo carga.
```

### 8.5 Datos masivos opcionales

Para probar paginación, dashboard y rendimiento:

```bash
cd backend/scripts
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

python3 seed_massive.py \
  --db-url "postgresql://sfm_dev:<password>@127.0.0.1:15432/fac_med_db" \
  --dry-run
```

Quitar `--dry-run` para insertar. No ejecutar contra producción.

---

## 9. Fase 6 — Wrapper local

Crear en `scripts/`:

| Script | Acción |
|---|---|
| `dev-up.sh` | Verifica el túnel, arranca Redis en el homelab y espera `PONG` |
| `dev-down.sh` | Detiene Redis; no detiene el túnel ni PostgreSQL |
| `dev-status.sh` | Muestra túnel, puertos, Redis y `pg_isready` |

### `dev-up.sh` (comportamiento)

1. Verifica que `postgresql-tunnel.service` esté activo.
2. Si `15432` o `6379` no escuchan, reinicia el túnel.
3. Ejecuta `docker compose up -d` en Debian vía SSH.
4. Espera a que Redis responda.
5. Verifica `pg_isready` contra `sfm_dev@127.0.0.1:15432`.
6. Imprime el comando para arrancar el backend.

### `dev-down.sh` (comportamiento)

1. Ejecuta `docker compose stop` en Debian.
2. No detiene el túnel: lo comparten otros proyectos.
3. No detiene PostgreSQL nativo.

### `dev-status.sh` (comportamiento)

- `systemctl --user is-active postgresql-tunnel.service`
- `ss -ltn` para `15432` y `6379`
- `docker compose ps`
- `pg_isready`
- `redis-cli ping` vía `docker exec` o `nc -z`

---

## 10. Fase 7 — Limpieza de Docker local

Eliminar del repositorio:

```text
docker-compose.yml
backend/src/main/resources/application-dev.yml
backend/src/main/resources/application-docker.yml
```

Mantener:

```text
backend/Dockerfile                  # sigue siendo para Heroku/producción
backend/src/main/resources/application-prod.yml
backend/src/main/resources/application-test.yml
backend/src/test/resources/application-integration-e2e.yml
```

Actualizar documentación:

- `README.md`: reemplazar “docker compose up” por el flujo homelab.
- `backend/README.md`: quitar referencias a PostgreSQL local en 5434.
- `backend/docs/01-configuration.md`: reemplazar perfiles `dev`/`docker` por
  `dev-homelab`.
- `frontend/README.md`: solo si menciona el backend local de otra forma.
- `CLAUDE.md`: actualizar localmente si se usa como guía del agente.

---

## 11. Tests sin Docker local

El proyecto usa Testcontainers para tests `*DataJpaTest` y `*FlowE2ETest`.
Sin Docker local, la suite completa no corre en la PC.

Estrategia inmediata:

- Local: tests unitarios y WebMvc.
- Suite completa: GitHub Actions o una máquina con Docker, más adelante.

Agregar un perfil Maven `local-no-docker` que excluya:

```text
**/*DataJpaTest.java
**/*FlowE2ETest.java
```

O documentar el comando equivalente. Esto queda como tarea de la fase de
desarrollo, no bloquea la infraestructura.

---

## 12. Checklist de validación

| Prueba | Esperado |
|---|---|
| `psql` como `sfm_dev` a `fac_med_db` | OK |
| `\dx` | `uuid-ossp`, `pgcrypto`, `btree_gist`, `vector` |
| Redis `PING` | `PONG` |
| Flyway | V1–V11, sin errores |
| `vector_store` códigos | 14.208 |
| Arranque normal | “CIE-10 ya indexado… omitiendo carga” |
| Login `admin/admin123` | OK |
| Login `doctor1/doctor123` | OK |
| Login `recep1/recep123` | OK |
| P1 ICD-10 | responde |
| P4 sugerencia de ítems | responde |
| Frontend | login y navegación |
| `dev-down` / `dev-up` | Redis se detiene/arranca; datos persisten |
| `pg_dump -d fac_med_db` | dump correcto |

---

## 13. Rollback

Como producción no se toca, el rollback es local:

1. Detener backend y Redis.
2. Hacer `pg_dump` de `fac_med_db` si hay datos que conservar.
3. `DROP DATABASE fac_med_db;` y `DROP ROLE sfm_dev;` si se decide reiniciar.
4. Revertir los cambios de perfil/compose/docs en Git.
5. El túnel puede quedar con el forward de Redis o revertirse al original.

No se debe tocar `neonvibe`, `desarrollo`, `postgres` ni la configuración del
clúster sin un plan aparte.

---

## 14. Riesgos y notas

- **Flyway + extensiones:** `vector` no es trusted. Ya se pre-crea como
  `postgres`; validar el primer arranque. Si falla, usar rol de migración.
- **PG17 vs PG16:** producción/Testcontainers usan PG16. La diferencia es
  menor, pero hay que validar migraciones y queries con pgvector 0.8.0.
- **Cluster compartido:** `max_connections=100`; el perfil usa un pool de 5.
  No ejecutar cargas pesadas sin medir.
- **HDD:** el índice HNSW y las consultas vectoriales pueden ser más lentos
  que en un SSD.
- **Túnel compartido:** reiniciarlo corta brevemente `15432`. No crear una
  segunda unidad; se decidió una sola conexión.
- **Redis sin password:** aceptable solo porque está en loopback y detrás de
  SSH. No exponerlo en LAN ni Cloudflare.
- **Import de vectores:** filtrar por `metadata->>'code'` para no traer
  historias clínicas de producción.
- **Tests:** la suite completa de backend queda para CI o una máquina con
  Docker.
- **Upstash/Neon:** producción sigue igual; no reutilizar sus credenciales en
  desarrollo.

---

## 15. Fuera de alcance

- Cambios en Heroku, Vercel, Neon o Upstash.
- CI/CD (se define después).
- Migrar backend/frontend al homelab.
- Exponer PostgreSQL o Redis a internet.
- Cambiar la configuración del clúster PostgreSQL existente.

---

## 16. Orden de ejecución

1. Instalar pgvector y crear `fac_med_db`/`sfm_dev`/extensiones.
2. Verificar conexión por el túnel actual.
3. Crear el compose de Redis y probarlo manualmente.
4. Ampliar el túnel con Redis y verificar ambos puertos.
5. Agregar el perfil `dev-homelab` y el `.env`.
6. Primer arranque con indexación desactivada; importar vectores CIE-10.
7. Arranque normal y validaciones.
8. Crear wrapper `dev-up`/`dev-down`.
9. Limpiar Docker local y actualizar documentación.
10. Definir estrategia de tests sin Docker local.
