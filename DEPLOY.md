# Despliegue en la nube — Sistema de Facturación Médica

Documentación del proceso de despliegue del MVP a producción. Cubre la arquitectura elegida, los pasos realizados, los problemas encontrados y las soluciones aplicadas.

**URL de producción:** https://sistema-facturacion-medica-springbo.vercel.app

---

## Arquitectura de producción

| Capa | Servicio | Plan | Por qué |
|---|---|---|---|
| Frontend | **Vercel** | Free | Deploy automático desde GitHub, CDN global, SPA routing |
| Backend | **Heroku** | Basic dyno ($7/mes) | Créditos GitHub Student, soporte para contenedores Docker |
| Base de datos | **Neon** | Free tier | PostgreSQL 15 managed con extensión `pgvector` incluida |
| Redis | **Upstash** | Free tier | Redis serverless para JWT blacklist y caché |

---

## Fase 1 — Dockerizar el backend

### Dockerfile (multi-stage build)

Se usó un build en dos etapas para mantener la imagen final ligera:

1. **Stage `build`**: imagen JDK completa para compilar con Maven
2. **Stage final**: solo JRE (más liviano) con el `.jar` generado

```dockerfile
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline -q --no-transfer-progress
COPY src ./src
RUN ./mvnw package -DskipTests -q --no-transfer-progress

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=45.0", \
  "-XX:MaxMetaspaceSize=160m", \
  "-XX:ReservedCodeCacheSize=64m", \
  "-XX:+UseG1GC", \
  "-jar", "app.jar"]
```

### Flags JVM para dyno de 512 MB

El dyno Basic de Heroku tiene 512 MB de RAM. Sin ajuste, Spring Boot 4 + Spring AI excedía el límite causando errores R15 (SIGKILL). Solución:

- `-XX:MaxRAMPercentage=45.0` — limita el heap al 45% de la RAM del contenedor (~230 MB)
- `-XX:MaxMetaspaceSize=160m` — cap explícito al metaspace (clases cargadas)
- `-XX:ReservedCodeCacheSize=64m` — cap al cache del compilador JIT
- `-XX:+UseG1GC` — garbage collector más eficiente en memoria limitada
- `spring.main.lazy-initialization: true` — los beans de Spring AI se inicializan solo cuando se usan por primera vez, reduciendo el pico de memoria al arrancar

**Resultado**: pico de arranque bajó de ~1097 MB (R15 SIGKILL) a ~559 MB (R14 warning leve, app funcional).

### application-prod.yml

El perfil de producción configura:
- `PORT` dinámico (Heroku asigna el puerto via variable de entorno)
- Hikari pool reducido (máximo 5 conexiones para no saturar Neon free tier)
- `flyway.baseline-on-migrate: true` para permitir que Flyway opere sobre un schema pre-existente
- Redis con SSL (`ssl.enabled: true`) requerido por Upstash
- CORS configurable via variable de entorno `ALLOWED_ORIGINS`

---

## Fase 2 — Provisionamiento de Neon y Upstash

### Neon (PostgreSQL + pgvector)

1. Crear proyecto en [neon.tech](https://neon.tech) → PostgreSQL 15
2. Copiar la connection string del panel: `postgresql://usuario:pass@host/db?sslmode=require`
3. La extensión `pgvector` ya está disponible en Neon sin configuración adicional

**Variables de entorno en Heroku:**
```
DATABASE_URL=jdbc:postgresql://host/db?sslmode=require
DATABASE_USERNAME=neondb_owner
DATABASE_PASSWORD=...
```

> Nota: Heroku requiere el prefijo `jdbc:` para Spring Boot. La URL de Neon trae `postgresql://` — hay que cambiarlo manualmente.

### Upstash (Redis)

1. Crear database en [upstash.com](https://upstash.com) → Redis
2. Copiar host, port y password del panel

**Variables de entorno en Heroku:**
```
REDIS_HOST=...upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=...
```

Upstash requiere conexión TLS — por eso `spring.data.redis.ssl.enabled: true` en el perfil prod.

---

## Fase 3 — Migración de embeddings ICD-10

Los 14,208 vectores CIE-10 se migraron desde la base de datos local (Docker) a Neon usando `pg_dump` y un contenedor de PostgreSQL como cliente:

```bash
# Dump solo de la tabla vector_store
docker exec sfm-postgres pg_dump \
  -U medisys -d fac_med_db \
  --data-only --no-owner \
  -t vector_store \
  > /tmp/vector_dump.sql

# Importar a Neon usando imagen Docker de postgres como cliente psql
docker run --rm -i postgres:15 \
  psql "postgresql://usuario:pass@host/db?sslmode=require" \
  < /tmp/vector_dump.sql
```

> Este patrón (imagen Docker como cliente psql) es útil cuando no se tiene `psql` instalado localmente.

---

## Fase 4 — Despliegue del backend en Heroku

### Heroku Container Registry

Heroku soporta dos modos de deploy: **buildpacks** (automático) y **Container Registry** (Docker). Se usó Container Registry porque el proyecto ya tiene un Dockerfile.

```bash
# 1. Configurar la app para usar contenedores
heroku stack:set container -a sfm-backend-fepdev

# 2. Login al registry de Heroku
heroku container:login

# 3. Build y push manual (el CLI de Heroku usa un builder legacy
#    que no soporta --provenance, así que se bypasea)
docker build -t registry.heroku.com/sfm-backend-fepdev/web .
docker push registry.heroku.com/sfm-backend-fepdev/web

# 4. Activar el contenedor
heroku container:release web -a sfm-backend-fepdev
```

### Variables de entorno en Heroku

```bash
heroku config:set \
  SPRING_PROFILES_ACTIVE=prod \
  DATABASE_URL=jdbc:postgresql://... \
  DATABASE_USERNAME=neondb_owner \
  DATABASE_PASSWORD=... \
  REDIS_HOST=...upstash.io \
  REDIS_PORT=6379 \
  REDIS_PASSWORD=... \
  JWT_SECRET=... \
  ANTHROPIC_API_KEY=sk-ant-... \
  GOOGLE_API_KEY=AIza... \
  ALLOWED_ORIGINS=https://sistema-facturacion-medica-springbo.vercel.app \
  SPRING_FLYWAY_BASELINE_ON_MIGRATE=true \
  SPRING_FLYWAY_BASELINE_VERSION=0 \
  -a sfm-backend-fepdev
```

> El `JWT_SECRET` se genera con `openssl rand -base64 64 | tr -d '\n'`. El `%` final que muestra la terminal zsh es el indicador de "sin salto de línea" — no forma parte del valor.

### Problema: Flyway y schema pre-existente

Al desplegar, Flyway lanzaba el error:
```
Found non-empty schema(s) but no schema history table
```

Causa: la tabla `vector_store` (migrada manualmente) ya existía, pero Flyway no encontraba su tabla de historial.

Solución: `baseline-on-migrate: true` + `baseline-version: "0"` le indica a Flyway que trate el estado actual del schema como el punto de partida (baseline) y aplique solo las migraciones posteriores.

---

## Fase 5 — Despliegue del frontend en Vercel

### Conexión del repositorio

1. Importar el repositorio en [vercel.com](https://vercel.com)
2. Configurar **Root Directory** → `frontend`
3. Framework preset: **Vite**

### Variable de entorno en Vercel

```
VITE_API_URL=https://sfm-backend-fepdev.herokuapp.com/api/v1
```

### SPA Routing con TanStack Router

TanStack Router usa enrutamiento del lado del cliente. Sin configuración adicional, al refrescar una ruta como `/patients` Vercel devuelve 404. Solución: `vercel.json` en la raíz del frontend:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### TypeScript en modo estricto (build de producción)

El build local funcionaba con `"ignoreDeprecations": "6.0"` en `tsconfig.app.json`, que silenciaba errores de TypeScript 5.x. Vercel usa la versión exacta del `package.json` y rechazó ese valor.

Al eliminar esa opción, aparecieron errores estrictos en archivos de test y mocks. Solución en `tsconfig.app.json`:

```json
"exclude": [
  "src/mocks",
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/*.spec.ts",
  "**/*.spec.tsx"
]
```

Los archivos de test tienen tipos más relajados a propósito (mocks, stubs) y no deben incluirse en el build de producción.

### CORS

El backend lee los orígenes permitidos desde la variable `ALLOWED_ORIGINS`. Después de obtener la URL de Vercel, se actualiza en Heroku y se hace rebuild del contenedor:

```bash
heroku config:set ALLOWED_ORIGINS="https://sistema-facturacion-medica-springbo.vercel.app" -a sfm-backend-fepdev
docker build -t registry.heroku.com/sfm-backend-fepdev/web .
docker push registry.heroku.com/sfm-backend-fepdev/web
heroku container:release web -a sfm-backend-fepdev
```

---

## Migración de datos de aplicación

### Por qué no se usó el seed automático

El seed de desarrollo (`db/seeds/V7__seeds.sql`) solo se carga con el perfil `dev`. En producción, Flyway aplica solo las migraciones (`db/migration/`), que crean el schema y los usuarios del sistema pero no los datos de prueba.

### Migración tabla por tabla

La base de datos local tenía ~40,000 registros de desarrollo/testing. Un `pg_dump` directo fallaba porque:

1. **Neon no permite `ALTER TABLE ... DISABLE TRIGGER ALL`** (triggers de sistema de FK son protegidos)
2. **Neon no permite `SET session_replication_role = replica`** (requiere superuser)
3. **Registros huérfanos**: 61 `medical_records` y 18 `invoices` referenciaban `appointments` que ya no existían en local (datos inconsistentes de sesiones de prueba anteriores)

Solución: importar tabla por tabla en orden FK-safe, filtrando los registros huérfanos con `WHERE appointment_id IN (SELECT id FROM appointments)`:

```bash
# Tablas base (sin dependencias problemáticas)
for table in system_users insurance_providers services_catalog \
             medications_catalog patients doctors insurance_policies \
             appointments invoice_sequences audit_log; do
  docker exec sfm-postgres pg_dump -U medisys -d fac_med_db \
    --data-only --no-owner -t $table | \
    docker run --rm -i postgres:15 psql "$NEON_URL"
done

# Tablas con potenciales huérfanos — filtrar con WHERE
docker exec sfm-postgres psql -U medisys -d fac_med_db -c \
  "\copy (SELECT * FROM medical_records WHERE appointment_id IN (SELECT id FROM appointments)) TO STDOUT" | \
  docker run --rm -i postgres:15 psql "$NEON_URL" -c "\copy medical_records FROM STDIN"
```

### Resultado final en Neon

| Tabla | Registros |
|---|---|
| patients | 1,087 |
| doctors | 31 |
| system_users | 33 |
| appointments | 6,083 |
| medical_records | 4,871 |
| diagnoses | 7,300 |
| prescriptions | 6,830 |
| procedures | 2,321 |
| invoices | 4,135 |
| invoice_items | 10,362 |
| payments | 4,201 |
| insurance_policies | 446 |
| vector_store (ICD-10) | 14,208 |

---

## Credenciales de acceso (entorno de demo)

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `doctor1` | `doctor123` | DOCTOR |
| `recep1` | `recep123` | RECEPTIONIST |

---

## Servicios y herramientas aprendidas

- **Docker multi-stage build** para optimizar imágenes de producción
- **Heroku Container Registry** como alternativa a buildpacks cuando ya existe un Dockerfile
- **Neon** como PostgreSQL managed con pgvector sin configuración adicional
- **Upstash** como Redis serverless con conexión TLS
- **Vercel** para SPA con enrutamiento del lado del cliente (`vercel.json`)
- **pg_dump / psql** para migración de datos entre PostgreSQL instancias
- **Imagen Docker como cliente psql** cuando no hay psql instalado localmente
- **Flyway baseline-on-migrate** para integrar migraciones en schemas pre-existentes
- **Tuning JVM** para entornos con memoria limitada (contenedores, dynos)
- **TypeScript strict mode** en build de producción vs desarrollo local
