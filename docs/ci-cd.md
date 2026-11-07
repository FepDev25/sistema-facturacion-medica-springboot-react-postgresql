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

## Primer deploy con la imagen nueva

El `Dockerfile` con `-Xmx160m`, `-Xss512k` y `ExitOnOutOfMemoryError` ya está en
`main`, pero producción todavía corre la imagen anterior. El primer deploy del
workflow aplica ese cambio.

Después de que el workflow termine en verde:

```bash
# Verificar que el dyno usa el comando nuevo
heroku ps -a sfm-backend-fepdev

# Quitar el hotfix temporal de memoria
heroku config:unset JAVA_TOOL_OPTIONS -a sfm-backend-fepdev

# Ver logs y confirmar que no reaparece R14
heroku logs --tail -a sfm-backend-fepdev
```

En `heroku ps` el comando debe incluir `-Xmx160m` y `-Xss512k`. Si el dyno
vuelve a mostrar `MaxRAMPercentage=45`, el release no tomó la imagen nueva.

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
| Testcontainers intenta una API de Docker inexistente | `docker.api.version` forzado | Ya se eliminó el hardcode; dejar que Testcontainers negocie |
| Falla el gate de JaCoCo | Cobertura real por debajo del umbral | Revisar el reporte `backend-reports` |
| Falla el login de Heroku | `HEROKU_API_KEY` ausente o vencido | Regenerar el token y actualizar el secret |
| El smoke test no llega a 200 | El dyno todavía está arrancando o crasheó | Revisar `heroku logs`; el job reintenta 5 minutos |
