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

- **Backend**: `./mvnw -B -ntp verify`. Corre los 412 tests, incluidos los de
  Testcontainers, y aplica el gate de JaCoCo.
- **Frontend**: `npm ci`, `npm run lint`, `npm run test:coverage` y
  `npm run build`.

El job de deploy no se ejecuta en PRs. Vercel genera una preview del frontend.

### Push a `main`

1. Corren los mismos jobs de CI.
2. Si ambos pasan, se ejecuta `deploy-backend`.
3. El deploy construye la imagen con `backend/Dockerfile`, la publica en el
   registry de Heroku y hace `heroku container:release web`.
4. Se hace un smoke test contra `/actuator/health` con hasta 5 minutos de
   reintentos.
5. Vercel despliega el frontend en paralelo desde Git.

Si CI falla, el backend no se despliega.

### Ejecución manual

Desde **Actions → CI → Run workflow** se puede ejecutar el pipeline. La opción
`deploy` permite desplegar a producción aunque el disparador no sea un push.

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

En **GitHub → Settings → Rules → Rulesets** (o Branch protection):

- Requerir pull request antes de mergear.
- Requerir los checks `Backend` y `Frontend`.
- Bloquear force pushes.

Con eso, `main` solo recibe commits que ya pasaron CI. Vercel puede seguir
desplegando desde `main` sin riesgo adicional.

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

## E2E (fase 2)

Los 126 tests de Playwright todavía no corren en CI. El plan es agregar un job
con:

- Servicios `pgvector/pgvector:pg16` y `redis:7-alpine`.
- Un perfil Spring `ci` con seeds y `app.ai.icd10.index-on-startup=false`.
- Backend empaquetado + `vite preview` + Playwright.

Se ejecutará en nightly o en PRs que toquen frontend, para no alargar todos los
PRs.

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
