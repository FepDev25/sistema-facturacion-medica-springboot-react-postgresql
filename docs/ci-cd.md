# CI/CD

Pipeline de integración y despliegue continuo sobre GitHub Actions.

## Arquitectura

| Pieza | Servicio | Disparador |
|---|---|---|
| CI | GitHub Actions | Pull requests y pushes a `main` |
| Backend | Heroku Container Registry | Push a `main` con CI verde, o `workflow_dispatch` |
| Frontend | Vercel Git integration | Push a `main` y previews por PR |
| Base de datos | Neon | Sin cambios |
| Redis | Upstash | Sin cambios |

El workflow vive en
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

## Flujo

### Pull request

Se ejecutan dos jobs en paralelo:

- **Backend**: `./mvnw -B -ntp verify`. Corre la suite completa (458 unitarios +
  integración con Testcontainers) y aplica el gate de JaCoCo.
- **Frontend**: `npm ci`, `npm run lint`, `npm run test:coverage` y
  `npm run build`.

El job de deploy no se ejecuta en PRs. Vercel genera una preview del frontend.

### Push a `main`

1. Corren los mismos jobs de CI.
2. El job **Cambios** compara el commit anterior con el actual y detecta si se
   tocó `backend/`.
3. Si backend y frontend pasan y hubo cambios de backend, se ejecuta
   `deploy-backend`. Un push que solo toca docs, frontend o workflows no
   redeploya el backend.
4. El deploy construye la imagen con `backend/Dockerfile`, la publica en el
   registry de Heroku y hace `heroku container:release web`.
5. Se hace un smoke test contra `/actuator/health` con hasta 5 minutos de
   reintentos.
6. Vercel despliega el frontend en paralelo desde Git.

Si CI falla, el backend no se despliega. Si el filtro de cambios falla o no
puede calcular el diff, el workflow es conservador y despliega.

### Ejecución manual

Desde **Actions → CI → Run workflow** se puede ejecutar el pipeline. La opción
`deploy` fuerza el deploy aunque el diff no toque `backend/`.

## Configuración inicial

### 1. Crear el token de Heroku

Ejecutar una sola vez:

```bash
heroku authorizations:create \
  --description "GitHub Actions sfm-backend" \
  --scope global \
  --short
```

Guardar el valor devuelto como secret `HEROKU_API_KEY` en GitHub.

### 2. Configurar secrets y variables

En **GitHub → Settings → Secrets and variables → Actions**:

**Secret:**

| Nombre | Valor |
|---|---|
| `HEROKU_API_KEY` | Token creado en el paso anterior |

**Variables (opcionales, tienen fallback en el workflow):**

| Nombre | Valor |
|---|---|
| `HEROKU_APP` | `sfm-backend-fepdev` |
| `PROD_URL` | `https://sfm-backend-fepdev-a04e4eeac708.herokuapp.com` |
| `PROD_HEALTH_URL` | `https://sfm-backend-fepdev-a04e4eeac708.herokuapp.com/actuator/health` |

No subir a GitHub `DATABASE_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY` ni
`GOOGLE_API_KEY`. Esos valores viven solo en Heroku y Vercel.

### 3. Proteger `main`

> **Aplicado el 2026-11-08.** Verificado con la API de GitHub: checks
> `Backend` y `Frontend`, PR obligatorio, 0 aprobaciones, rama actualizada,
> administradores incluidos y force push bloqueado.

Con GitHub CLI autenticado como administrador del repo:

```bash
./scripts/setup-branch-protection.sh
```

El script configura:

- Pull request obligatorio.
- Checks obligatorios `Backend` y `Frontend`.
- Rama actualizada antes de mergear.
- Sin force pushes ni borrados.
- Aplicado también a administradores.

Alternativa manual: **GitHub → Settings → Rules → Rulesets** (o Branch
protection) y replicar esas opciones.

La protección es una acción administrativa: si `gh` no está instalado o no hay
una sesión con permisos de admin, el script falla con un mensaje claro. En ese
caso hay que ejecutar el script desde una máquina autenticada o aplicar la
configuración desde la UI.

## Primer deploy con la imagen nueva (hecho)

El primer deploy del workflow se completó el **2026-11-08**:

| Release | Cambio |
|---|---|
| `v13` | Imagen nueva con `-Xmx160m`, `-Xss512k`, `MaxMetaspaceSize` y `ExitOnOutOfMemoryError` |
| `v14` | Se retiró `JAVA_TOOL_OPTIONS`; el dyno ya usa solo los flags del `Dockerfile` |

Verificación:

```bash
heroku ps -a sfm-backend-fepdev
heroku releases -a sfm-backend-fepdev
heroku logs -n 300 -a sfm-backend-fepdev | grep -iE "R14|OutOfMemory|ERROR"
```

El dyno arranca en ~11 s, el health check responde 200 y no hay R14. Si en el
futuro un release vuelve a mostrar `MaxRAMPercentage=45`, significa que no tomó
la imagen nueva.

## Rollback

### Backend

```bash
# Ver releases
heroku releases -a sfm-backend-fepdev

# Volver a la release anterior
heroku releases:rollback -a sfm-backend-fepdev
```

También se puede re-ejecutar el workflow desde un commit anterior con la opción
`deploy`.

### Frontend

Usar **Vercel → Deployments → Promote to Production** sobre un deployment
anterior.

## Tests locales

### Backend sin Docker

Los tests de unidad no necesitan Docker:

```bash
cd backend
./mvnw -Punit test
```

Corre 384 tests y omite los `*DataJpaTest`, `*FlowE2ETest` y
`BackendApplicationTests`, que requieren Testcontainers.

La suite completa sigue necesitando Docker:

```bash
cd backend
./mvnw verify
```

`DockerTestSupport` detecta la versión de API del daemon con `docker version`
antes de que Testcontainers arranque. Si hiciera falta forzarla:

```bash
./mvnw verify -Dapi.version=1.44
# o
DOCKER_API_VERSION=1.44 ./mvnw verify
```

La propiedad `docker.api.version` también se acepta por compatibilidad, pero la
que lee Testcontainers es `api.version`.

### Frontend

```bash
cd frontend
npm ci
npm run lint
npm run test:coverage
npm run build
```

## Cobertura

| Proyecto | Gate |
|---|---|
| Backend | 80% líneas / 65% ramas (JaCoCo, `verify`) |
| Frontend | 35% statements / 30% branches / 38% functions / 36% lines (Vitest) |

Los umbrales del frontend son un piso medido en noviembre de 2026. Se pueden
subir cuando la cobertura real mejore; no se bajan para destrabar un PR.

## E2E Playwright

El workflow [`e2e.yml`](../.github/workflows/e2e.yml) corre la suite completa de
Playwright contra un backend y un frontend reales.

### Cuándo corre

- Pull requests que tocan `frontend/**`, `backend/**` o el propio workflow.
- Push a `main` con esos mismos paths.
- `workflow_dispatch`.
- Schedule semanal, lunes a las 06:00 UTC.

### Infraestructura efímera

| Servicio | Imagen |
|---|---|
| PostgreSQL + pgvector | `pgvector/pgvector:pg16` |
| Redis | `redis:7-alpine` |

El backend se compila con `-Dmaven.test.skip=true` y arranca con el perfil
`ci`, usando `backend/ci/application-ci.yml`. Ese perfil:

- Apunta a PostgreSQL y Redis locales del runner.
- Incluye `db/migration` y `db/seeds`.
- Desactiva la indexación de los 14.208 códigos CIE-10.
- Configura CORS para `localhost:5173` y `127.0.0.1:5173`.

El frontend se compila sin URL absoluta: llama a `/api/v1` y `vite preview`
reenvía al backend con `VITE_DEV_API_TARGET=http://127.0.0.1:8080`. Playwright
corre con `workers: 1` en CI para evitar interferencia entre tests que comparten
la misma base. El proxy mantiene las cookies `httpOnly` como first-party.

### Ejecución local

Con el entorno del homelab levantado:

```bash
./scripts/dev-up.sh

# Terminal 1
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev-homelab

# Terminal 2
cd frontend
npm run dev

# Terminal 3
cd frontend
E2E_BASE_URL=http://localhost:5173 \
E2E_ADMIN_USER=admin E2E_ADMIN_PASS=admin123 \
E2E_DOCTOR_USER=doctor1 E2E_DOCTOR_PASS=doctor123 \
E2E_RECEPTIONIST_USER=recep1 E2E_RECEPTIONIST_PASS=recep123 \
npm run e2e
```

La suite local validada en noviembre de 2026: **108 passed, 18 skipped, 0
failed**. En CI con los seeds: **116 passed, 10 skipped, 0 failed**. Los skips
son condicionales del dataset (por ejemplo, paciente sin alergias o factura que
no está en borrador).

El job se fija en `ubuntu-24.04` porque Playwright 1.59 todavía no soporta las
dependencias de Ubuntu 26, que es el nuevo `ubuntu-latest`.

En CI, los artefactos `playwright-results` incluyen screenshots, videos,
traces, el reporte HTML y los logs del backend/frontend.

> El workflow E2E corre en paralelo al CI principal y **no bloquea el deploy**
> todavía. Si se quiere que sea un gate de producción, hay que integrarlo como
> `needs` del job de deploy o esperar el resultado con `workflow_run`.

## Dependabot

[`.github/dependabot.yml`](../.github/dependabot.yml) actualiza semanalmente:

- Maven en `/backend`.
- npm en `/frontend`.
- GitHub Actions en `/`.

Los updates `minor`/`patch` se agrupan en un PR por ecosistema; los `major`
quedan como PRs individuales para revisarlos con más cuidado.

## Troubleshooting

| Síntoma | Causa probable | Acción |
|---|---|---|
| `Cannot connect to the Docker daemon` en CI | El runner no expone Docker | Verificar que el job use `ubuntu-latest` |
| Testcontainers usa una API de Docker vieja | docker-java usa `1.32` por defecto y el engine exige `>= 1.40` | `DockerTestSupport` detecta la versión del servidor con `docker version` antes de arrancar los contenedores |
| Falla el gate de JaCoCo | Cobertura real por debajo del umbral | Revisar el reporte `backend-reports` |
| `docker push ... unsupported` | Heroku solo acepta Docker Manifest V2; buildx generó un índice OCI con attestations | Mantener `provenance: false`, `sbom: false` y `oci-mediatypes=false` en `docker/build-push-action` |
| El deploy falla en `Verificar Heroku CLI` | El runner no trae el CLI en PATH | El workflow lo instala con `install.sh` |
| Falla el login de Heroku | `HEROKU_API_KEY` ausente o vencido | Regenerar el token y actualizar el secret |
| El smoke test no llega a 200 | El dyno todavía está arrancando o crasheó | Revisar `heroku logs`; el job reintenta 5 minutos |
| Un test falla y no se ve el detalle | Los logs del job requieren autenticación | El step `Resumir fallos de tests` publica los `[ERROR]` de Maven como anotaciones del check run |
| E2E: el backend no arranca | PostgreSQL/Redis no están listos o el perfil `ci` no se cargó | Revisar `/tmp/e2e-backend.log` en el artefacto `playwright-results` |
| E2E: errores 403/CORS | El origen del frontend no está permitido | Verificar `app.cors.allowed-origins` en `backend/ci/application-ci.yml` |
