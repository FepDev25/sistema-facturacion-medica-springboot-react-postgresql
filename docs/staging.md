# Staging

Plan del ambiente de staging para validar cambios antes de producción. **Este
documento describe el diseño; los recursos cloud no se crean desde el
repositorio.** El workflow
[`.github/workflows/staging.yml`](../.github/workflows/staging.yml) está
deshabilitado por defecto y solo se ejecuta cuando existe la variable
`STAGING_ENABLED=true`.

## 1. Objetivo y alcance

Staging reproduce la arquitectura de producción con recursos separados:

| Pieza | Producción | Staging |
|---|---|---|
| Backend | Heroku `sfm-backend-fepdev` | Heroku `sfm-backend-staging` (app nueva) |
| Frontend | Vercel proyecto productivo (`main`) | Vercel `sfm-frontend-staging` (CLI; alternativamente `develop`) |
| PostgreSQL | Neon `production` | Neon branch `staging` |
| Redis | Upstash `sfm-prod` | Upstash `sfm-staging` (o Redis del homelab) |
| Migraciones | Flyway al arrancar | Flyway al arrancar |
| Datos | Producción | Sintéticos / anonimizados |
| Dominio | `sistema-facturacion-medica-springbo.vercel.app` | Dominio `*.vercel.app` del proyecto staging |

Reglas:

- Staging **nunca** apunta a la base de producción ni comparte `JWT_SECRET`,
  `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `HEROKU_API_KEY` ni `DATABASE_URL`.
- Staging no se indexa en buscadores y no se enlaza desde la demo pública.
- El deploy de staging no modifica `main` ni los recursos de producción.

## 2. Recursos y nombres

Los nombres son placeholders; se reemplazan por los valores reales al crear los
recursos.

| Recurso | Nombre sugerido | Notas |
|---|---|---|
| App Heroku backend | `sfm-backend-staging` | Stack `container`, dyno Basic o Eco |
| Proyecto Vercel frontend | `sfm-frontend-staging` | Root Directory `frontend`, Production Branch `develop` |
| Branch Neon | `staging` | Bajo el mismo proyecto Neon, o un proyecto separado |
| Redis | `sfm-staging` en Upstash | Base separada y sin persistencia crítica |

### 2.1 Heroku

```bash
# Crear la app (una sola vez, fuera del workflow)
heroku create sfm-backend-staging --stack container

# Configurar sus variables (ver sección 3)
heroku config:set --app sfm-backend-staging ...
```

El backend se publica como imagen Docker igual que producción:

```bash
docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  --sbom=false \
  --output type=image,name=registry.heroku.com/sfm-backend-staging/web,push=true,oci-mediatypes=false \
  ./backend
heroku container:release web --app sfm-backend-staging
```

### 2.2 Vercel

El proyecto de staging es independiente del de producción. El workflow lo
despliega con la CLI de Vercel a su entorno **Production**; no usa Git
integration para evitar que el rewrite de `/api` del repositorio apunte al
backend productivo. Si más adelante se prefiere Git integration, el proyecto de
staging puede conectarse a la rama `develop` y resolver el rewrite con
`routes[].env` o `vercel.ts`.

Para que el rewrite `/api/*` apunte al backend de staging sin tocar
`frontend/vercel.json` (que apunta a producción), el workflow de staging usa la
CLI de Vercel y reescribe el destino **solo en el workspace del runner** antes
de `vercel build`:

```bash
python3 - <<'PY'
import json, os
path = 'frontend/vercel.json'
cfg = json.load(open(path))
cfg['rewrites'][0]['destination'] = os.environ['STAGING_BACKEND_URL'] + '/api/:path*'
json.dump(cfg, open(path, 'w'), indent=2, ensure_ascii=False)
open(path, 'a').write('\n')
PY
```

Así el repositorio mantiene un único `vercel.json` de producción y staging no
puede filtrar tráfico hacia el backend productivo. La alternativa soportada por
Vercel (rewrites con `routes[].env` o `vercel.ts`) queda como mejora futura si
se quiere eliminar la reescritura en CI; hoy implicaría cambiar también el
proyecto de producción y queda fuera del alcance.

### 2.3 Neon

Crear una branch `staging` del proyecto Neon:

1. Neon → **Branches → New branch** → nombre `staging`.
2. Copiar la cadena de conexión con `sslmode=require`.
3. Guardarla **solo** en la config de Heroku staging como
   `DATABASE_URL=jdbc:postgresql://...`, `DATABASE_USERNAME` y
   `DATABASE_PASSWORD`.

Recomendaciones:

- No usar la branch de producción como padre si no se van a anonimizar los
  datos. Preferible: branch creada una vez desde producción, purgada de PII y
  recargada con datos sintéticos, o un proyecto Neon independiente en free tier.
- Las branches de Neon son copy-on-write: recrear la branch es la forma más
  rápida de volver a un estado limpio.
- La branch de staging puede pausarse/suspenderse cuando no se usa.

## 3. Variables y secretos

### 3.1 GitHub Actions

**Variables** (Settings → Secrets and variables → Actions → Variables):

| Variable | Ejemplo | Uso |
|---|---|---|
| `STAGING_ENABLED` | `true` | Habilita el workflow. Sin ella, todos los jobs se omiten |
| `STAGING_HEROKU_APP` | `sfm-backend-staging` | App Heroku de staging |
| `STAGING_BACKEND_URL` | `https://sfm-backend-staging.herokuapp.com` | Rewrite `/api` y smoke test |
| `STAGING_HEALTH_URL` | `https://sfm-backend-staging.herokuapp.com/actuator/health` | Health check |
| `STAGING_FRONTEND_URL` | `https://sfm-frontend-staging.vercel.app` | Smoke test del frontend |

**Secrets**:

| Secret | Uso |
|---|---|
| `STAGING_HEROKU_API_KEY` | Token de Heroku limitado a la app de staging |
| `STAGING_VERCEL_TOKEN` | Token de Vercel para la CLI |
| `STAGING_VERCEL_ORG_ID` | ID de la organización/equipo en Vercel |
| `STAGING_VERCEL_PROJECT_ID` | ID del proyecto `sfm-frontend-staging` |

No se reutilizan los secretos de producción. Si se prefiere Git integration en
lugar de la CLI, el proyecto de Vercel de staging puede conectarse a `develop`
con un rewrite propio; en ese caso el workflow solo dispara un Deploy Hook
(`STAGING_VERCEL_DEPLOY_HOOK_URL`).

### 3.2 Heroku staging (`heroku config`)

```bash
heroku config:set --app sfm-backend-staging \
  SPRING_PROFILES_ACTIVE=prod \
  DATABASE_URL='jdbc:postgresql://...' \
  DATABASE_USERNAME='...' \
  DATABASE_PASSWORD='...' \
  REDIS_HOST='...' \
  REDIS_PORT='6379' \
  REDIS_PASSWORD='...' \
  JWT_SECRET="$(openssl rand -base64 64 | tr -d '\n')" \
  ANTHROPIC_API_KEY='...' \
  GOOGLE_API_KEY='...' \
  ALLOWED_ORIGINS='https://sfm-frontend-staging.vercel.app' \
  SPRING_FLYWAY_BASELINE_ON_MIGRATE=false
```

Notas:

- `SPRING_PROFILES_ACTIVE=prod` reutiliza el perfil de producción; staging se
  diferencia solo por sus variables (base, Redis y orígenes).
- `JWT_SECRET` propio: una cookie de staging no debe validar en producción.
- `ALLOWED_ORIGINS` debe incluir **solo** el dominio de staging. No añadir el de
  producción.
- Las API keys pueden ser claves restringidas o con presupuesto bajo; las evals
  reales siguen siendo manuales.
- Si staging usa el Redis del homelab, no configurar `REDIS_PASSWORD` y usar
  `spring.data.redis.ssl.enabled=false`; documentarlo como excepción.

## 4. Flujo de deploy

El workflow `staging.yml` se dispara con:

- `workflow_dispatch` (manual).
- Push a `develop`.

En ambos casos cada job tiene `if: vars.STAGING_ENABLED == 'true'`. Si la
variable no existe o vale otra cosa, el workflow termina sin desplegar.

Orden:

1. **Backend staging**: build de la imagen Docker, push al registry de Heroku
   staging, `container:release`, smoke test de `/actuator/health`.
2. **Frontend staging**: `npm ci`, `npm run build`, reescritura del rewrite de
   `/api` en el runner, `vercel pull/build/deploy --prod` contra el proyecto de
   staging y smoke test de `/`.
3. Si falla cualquiera de los dos, no se promueve nada a producción.

El flujo **no** ejecuta tests completos: se apoya en que `develop` ya pasó CI
(`Backend` y `Frontend`). Si se quiere un gate propio de staging, añadir
`needs`/reutilizar los jobs de `ci.yml` en una sesión posterior.

### 4.1 Migraciones Flyway

- El backend ejecuta Flyway al arrancar. En staging se aplican las mismas
  migraciones que en producción (`classpath:db/migration`).
- `SPRING_FLYWAY_BASELINE_ON_MIGRATE=false` salvo que la branch se haya creado
  desde un schema pre-existente sin historial. En ese caso se usa `true` +
  `baseline-version` y se documenta la excepción.
- Regla de compatibilidad: las migraciones deben ser **expand/contract**
  (añadir columna/tabla primero, desplegar código, eliminar después). No se
  dependen de rollbacks automáticos de Flyway.
- Antes de fusionar a `main`, validar en staging:
  `SELECT version, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;`
- Nunca se apunta staging a la branch de producción "para probar": si hace falta
  un dato de producción, se copia anonimizado.

### 4.2 Datos

- Datos sintéticos: ejecutar las migraciones y cargar un dataset de staging
  (pacientes, citas, facturas y pagos de prueba). No usar los seeds de
  desarrollo con credenciales conocidas en un entorno público.
- Si se parte de una branch de Neon con datos reales: anonimizar antes de
  exponer el frontend (nombres, DNI, teléfonos, notas clínicas).
- Refresco: recrear la branch `staging` desde el estado limpio y volver a cargar
  el dataset. No sincronizar producción → staging de forma automática.
- Los usuarios de prueba de staging se gestionan aparte; no reutilizar el
  `admin/admin123` de la demo pública.

## 5. Costos de referencia

Precios aproximados a noviembre de 2026; verificar en cada proveedor antes de
contratar.

| Servicio | Plan | Costo aproximado | Comentario |
|---|---|---|---|
| Heroku | Basic dyno | ~7 USD/mes (Eco ~5 USD/mes) | El dyno Eco duerme; sirve para staging de bajo uso |
| Vercel | Hobby | 0 USD | Proyecto staging dentro del plan personal |
| Neon | Free | 0 USD | Branches y almacenamiento dentro de los límites del free tier |
| Upstash | Free | 0 USD | Redis de staging sin persistencia crítica |
| Total mínimo | — | **~0–7 USD/mes** | Depende de si el backend duerme o no |

El costo dominante es el dyno de Heroku. Si staging solo se usa en sesiones de
validación, el dyno Eco y la branch de Neon pausada reducen el costo a casi cero.

## 6. Rollback

| Componente | Procedimiento | Tiempo esperado |
|---|---|---|
| Backend | `heroku releases:rollback -a sfm-backend-staging` | < 5 min |
| Frontend | Vercel → Deployments → Promote un deployment anterior del proyecto staging | < 2 min |
| Base de datos | Recrear la branch Neon `staging` desde el estado limpio y redeployar | 5–15 min |
| Migración problemática | Migración compensatoria `V<N+1>`; no editar una migración ya aplicada | Según cambio |
| Workflow | Poner `STAGING_ENABLED=false` deshabilita todos los jobs | inmediato |

Un rollback de staging **no** toca producción. Si el problema se detectó después
de fusionar a `main`, el rollback de producción se ejecuta según
[`docs/operaciones.md`](operaciones.md).

## 7. Operación y verificación

```bash
# Backend
curl -fsS "$STAGING_HEALTH_URL"
heroku logs --tail -a sfm-backend-staging
heroku ps -a sfm-backend-staging

# Frontend
curl -fsS "$STAGING_FRONTEND_URL/"

# Flyway
psql "$STAGING_DATABASE_URL" \
  -c "SELECT version, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;"
```

Checklist antes de promover staging → producción:

- [ ] `Backend` y `Frontend` verdes en el PR.
- [ ] `spotless:check`, `clean verify` y `npm run test:coverage` verdes.
- [ ] Migraciones aplicadas en staging y `flyway_schema_history` sin fallos.
- [ ] Smoke test de login, dashboard y un flujo de factura/pago.
- [ ] Variables de staging sin secretos de producción.
- [ ] Datos de staging anonimizados.
- [ ] Rollback de staging probado al menos una vez.

## 8. Creación inicial (checklist manual)

Nada de esto lo ejecuta el repositorio; se hace una sola vez con credenciales
del propietario:

1. Crear la app Heroku `sfm-backend-staging` y su token.
2. Crear la branch Neon `staging` y cargar el dataset sintético.
3. Crear el proyecto Vercel `sfm-frontend-staging` (sin Git integration o con
   Production Branch `develop`, según se elija).
4. Crear los secretos y variables de la sección 3.
5. Ejecutar **Actions → Staging → Run workflow** con `STAGING_ENABLED=true`.
6. Verificar health, frontend y login; luego dejar `STAGING_ENABLED` en `true`
   solo si se quiere deploy automático desde `develop`.
