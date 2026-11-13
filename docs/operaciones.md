# Operaciones: backups, restauración y alertas

Runbook de continuidad para producción (Heroku + Vercel + Neon + Upstash). El objetivo
es que cualquier incidente tenga un procedimiento probado y una señal automática, no
solo logs.

## 1. Objetivos de recuperación

| Componente | RPO | RTO | Estrategia |
|---|---|---|---|
| PostgreSQL (Neon) | ≈ 0 dentro de la ventana PITR de 6 h (plan actual) | 30–60 min | Restore a una branch temporal y promover tras validar |
| Redis (Upstash) | No crítico | 0 | Se pierden blacklist y contadores; las sesiones se revalidan contra la BD |
| Backend (Heroku) | 0 (imagen en registry) | 10 min | `heroku container:release` de la release anterior |
| Frontend (Vercel) | 0 (build inmutable) | 5 min | Rollback instantáneo a un deployment anterior |

El refresh token y su familia viven en PostgreSQL (`refresh_tokens`), no en Redis.
Perder Redis no cierra sesiones: solo se pierde la blacklist de access tokens y los
contadores de rate limit.

El plan actual conserva **6 h** de historial (`history_retention_seconds = 21600`),
así que un restore por timestamp solo es posible dentro de esa ventana. El primer
drill se ejecutó el **2026-11-13** (ver registro y evidencia).

## 2. Restore drill de Neon

Se ejecuta **trimestralmente** y se registra la fecha y el resultado en este documento.

### Procedimiento

1. Crear una branch temporal desde el punto de recuperación elegido (dashboard de
   Neon → **Branches → New branch** → *From current data* o *From a timestamp*, o
   mediante la API v2 con `parent_timestamp`).
2. Obtener la cadena de conexión de la branch temporal.
3. Validar integridad con consultas de solo lectura:

   ```bash
   psql "$NEON_RESTORE_URL" <<'SQL'
   SELECT count(*) AS patients FROM patients;
   SELECT count(*) AS invoices FROM invoices;
   SELECT count(*) AS payments  FROM payments;
   SELECT max(created_at) AS ultimo_pago FROM payments;
   SELECT version, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 3;
   SQL
   ```

4. Comparar contra producción (mismos conteos ± el delta esperado por el RPO).
5. Probar la aplicación contra la branch temporal:

   ```bash
   DATABASE_URL=jdbc:postgresql://... \
   DATABASE_USERNAME=... DATABASE_PASSWORD=... \
   ./mvnw -DskipTests spring-boot:run -Dspring-boot.run.profiles=prod
   curl -fsS localhost:8080/actuator/health
   ```

6. Borrar la branch temporal. **Nunca** se restaura encima de la branch de producción:
   si hace falta promover, se cambia `DATABASE_URL` de Heroku a la branch validada y
   se reinicia el dyno.

### Registro

| Fecha | Ejecutó | Branch origen | Resultado | Observaciones |
|---|---|---|---|---|
| 2026-11-13 | Felipe Peralta | `production` (`br-lucky-rice-atj5i1mm`) @ `2026-11-13T15:55:00Z` | **OK** | Branch `restore-drill-20261113` desde PITR de 15 min. Conteos, sumas y Flyway idénticos. Backend `prod` arrancó contra la branch: health `UP` y login `200`. Branch y endpoint eliminados; producción intacta. |

> El primer drill ya está ejecutado. Repetirlo trimestralmente y actualizar la tabla;
> sin evidencia reciente, el RTO vuelve a ser una hipótesis.

### 2.1 Evidencia del primer drill (2026-11-13)

- Branch temporal `restore-drill-20261113` (`br-withered-cell-at71ir0m`), endpoint
  `ep-muddy-firefly-at53feqg`, creada desde `production` con
  `parent_timestamp=2026-11-13T15:55:00Z` (15 min antes, dentro de la ventana PITR).
- Validación de integridad, idéntica a producción:

  | Métrica | Producción | Branch restaurada |
  |---|---:|---:|
  | Pacientes | 1.087 | 1.087 |
  | Citas | 6.087 | 6.087 |
  | Historias clínicas | 4.875 | 4.875 |
  | Facturas | 4.139 | 4.139 |
  | Pagos | 4.203 | 4.203 |
  | Vectores CIE-10 | 14.219 | 14.219 |
  | Suma de pagos | 5.709.334,80 | 5.709.334,80 |
  | Suma total facturado | 7.857.830,14 | 7.857.830,14 |
  | Último pago | 2026-06-23 05:32:22Z | 2026-06-23 05:32:22Z |
  | Flyway | V13 | V13 |

- Aplicación real con `SPRING_PROFILES_ACTIVE=prod` contra la branch:
  `Started BackendApplication in 12.251 seconds`, Flyway
  `Successfully validated 13 migrations`, `/actuator/health` → `UP` y
  `POST /api/v1/auth/login` (usuario `admin`) → `200`.
- Aislamiento comprobado: el login escribió un refresh token en la branch (4 filas)
  y no en producción (3 filas).
- Limpieza: branch y endpoint eliminados (el endpoint responde `404`). Los conteos,
  sumas y la versión de Flyway de producción quedaron idénticos antes y después.
- Tiempo observado: la branch quedó lista en segundos y el backend respondió `UP`
  aproximadamente 1 min después de crearla.

### 2.2 Reconciliación de facturas legacy (A.3)

Antes del fix de pagos, una factura podía quedar `pending`/`partial_paid` aunque su
responsabilidad ya estuviera cubierta. El diagnóstico está en
`scripts/diagnose-legacy-invoices.sql` y la corrección idempotente en la migración
`V13__reconcile_legacy_invoice_status.sql`.

Resultado del diagnóstico en producción (2026-11-09):

```
 invoice_number | status | total | insurance_coverage | patient_responsibility | paid_amount
----------------+--------+-------+--------------------+------------------------+-------------
(0 filas)
```

No había facturas atascadas, así que V13 se desplegó como red de seguridad para
otros entornos y no modificó datos. Repetir el diagnóstico si se restaura un backup
anterior al fix.

## 3. Alertas

### 3.1 Uptime (GitHub Actions)

`.github/workflows/uptime.yml` corre cada 15 minutos y comprueba:

- `GET /actuator/health` del backend (debe ser `200`).
- `GET /` del frontend (debe ser `200`).

Si falla, abre un issue con la etiqueta `incident` (o comenta el existente). Cuando
todo vuelve a responder, cierra los issues de uptime automáticamente. GitHub notifica
a los watchers del repositorio.

Limitaciones: GitHub puede retrasar los crons en horas pico y desactiva los workflows
programados tras 60 días sin actividad. Para un SLA estricto, conectar el mismo chequeo
a BetterStack/UptimeRobot.

### 3.2 Métricas (Prometheus/Alertmanager)

`ops/alerts/sfm-alerts.yml` define las reglas. Para usarlas, exponer
`/actuator/prometheus` (requiere agregar `micrometer-registry-prometheus`) o hacer
scrape del actuator de métricas. Reglas incluidas:

| Alerta | Condición | Severidad |
|---|---|---|
| `SfmBackendDown` | `up == 0` | critical |
| `SfmFrontendDown` | probe HTTP falla | critical |
| `SfmHigh5xxRate` | > 2 % de 5xx en 5 min | critical |
| `SfmHighLatencyP95` | p95 > 2 s en 5 min | warning |
| `SfmAiErrors` | > 0.1 errores/s de IA | warning |
| `SfmAiLatency` | p95 de IA > 20 s | warning |
| `SfmLoginFailures` | > 20 fallos en 5 min | warning |
| `SfmLoginBlocked` | cualquier bloqueo | info |
| `SfmRefreshReuse` | cualquier reuso de refresh token | **critical** |

`SfmRefreshReuse` es la señal de posible robo de sesión: la familia ya se revoca
automáticamente, pero hay que revisar logs y considerar rotar credenciales.

### 3.3 Heroku

```bash
heroku logs --tail -a sfm-backend-fepdev
heroku ps -a sfm-backend-fepdev
heroku metrics -a sfm-backend-fepdev
```

Alertar por `R14` (memoria), reinicios del dyno y errores 5xx en el router.

## 4. Runbook de incidentes

### Backend 5xx o dyno caído

1. `heroku ps` y `heroku logs --tail`; buscar `OutOfMemoryError`, timeouts de Neon o
   fallos de Flyway.
2. Si el último deploy es la causa: `heroku releases` y
   `heroku rollback v<N-1> -a sfm-backend-fepdev`.
3. Verificar `GET /actuator/health` y el dashboard.
4. Abrir postmortem con causa raíz y acción correctiva.

### Neon no responde

1. Revisar el estado del proyecto en el dashboard de Neon y los límites del plan.
2. Si hay corrupción o borrado accidental: ejecutar el restore drill (sección 2) y
   promover la branch validada.
3. Si es saturación de conexiones: reducir el pool (`maximum-pool-size`) y reiniciar
   el dyno.

### Redis/Upstash no responde

1. El login sigue funcionando (las familias están en PostgreSQL).
2. Se pierde la blacklist de access tokens: los tokens revocados pueden seguir válidos
   hasta 15 minutos. Si el incidente es de seguridad, rotar `JWT_SECRET` (cierra todas
   las sesiones) y reiniciar.
3. Los rate limits de IA y login se reinician; no hay impacto de datos.

### Reuso de refresh token detectado

1. Confirmar `auth.refresh.reuse` en métricas y el log
   `Reuso de refresh token detectado`.
2. La familia ya quedó revocada. Identificar usuario/familia en el log.
3. Si el patrón se repite para el mismo usuario, forzar cambio de contraseña y revisar
   accesos.
4. Si el reuso vino de un cliente legítimo con reloj muy desfasado, subir
   `app.auth.refresh.grace-seconds` (por defecto 15 s) y documentar.

### Rollback coordinado de autenticación

A.1 cambió el contrato de sesión: el frontend espera cookies `httpOnly` y el backend
las emite. Si hay que revertir, revertir **backend y frontend juntos** (Heroku a la
release anterior + deployment anterior de Vercel). Un rollback parcial deja a los
usuarios sin poder iniciar sesión.

### IA degradada o cara

1. Revisar `ai.requests{outcome="error"}` y `ai.latency`.
2. Si el proveedor está caído, la API responde 503; el resto del sistema sigue
   operativo.
3. Bajar `app.ai.rate-limit.requests-per-minute` si hay abuso.

## 5. Rotación de secretos

| Secreto | Dónde | Procedimiento |
|---|---|---|
| `JWT_SECRET` | Heroku config | Generar 256 bits en base64, `heroku config:set`, reiniciar. Cierra todas las sesiones |
| `DATABASE_PASSWORD` | Heroku config + Neon | Rotar en Neon y actualizar Heroku en la misma ventana |
| `REDIS_PASSWORD` | Heroku config + Upstash | Rotar en Upstash y actualizar Heroku |
| `HEROKU_API_KEY` | GitHub Secrets | Regenerar la autorización de Heroku y actualizar el secret |
| `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` | Heroku config | Rotar en el proveedor y actualizar Heroku |

Después de rotar `JWT_SECRET`, las cookies viejas dejan de validar y el frontend
redirige a login en el primer request.
