# IA en producción

Capa de endurecimiento de los cuatro asistentes AI (P1/P2/P3/P4). El objetivo no es
cambiar los prompts, sino que una llamada al modelo no pueda tumbar el backend ni
degradar la experiencia sin control.

## Guardrails

| Control | Implementación | Config |
|---|---|---|
| Rate limit por usuario | `AiRateLimiter` + `AiRateLimitFilter` (ventana fija de 1 minuto) | `app.ai.rate-limit.requests-per-minute` (20) |
| Almacenamiento del rate limit | Redis (`INCR` + `PEXPIRE` atómico) con fallback a memoria por instancia | `RateLimitStore` / `FallbackRateLimitStore` |
| Timeout | `AiCallExecutor` ejecuta la llamada en un pool y corta a los N segundos | `app.ai.timeout-seconds` (30) |
| Reintento | 1 reintento ante error transitorio; **no** se reintenta un timeout | `app.ai.max-retries` (1) |
| Límite de entrada | Bean Validation en los DTO (`@Size`) | 500 query/pregunta, 8000 notas, 4000 examen, 1000 motivo |
| Determinismo | Temperatura global 0.0 para tareas estructuradas | `spring.ai.anthropic.chat.options.temperature` |
| Respuesta de error | 429 + `Retry-After` si se excede el límite; 503 si el proveedor falla o expira | `AiRateLimitFilter`, `HandlerException` |

El rate limit de IA y el de login comparten `RateLimitStore`. Con un solo dyno el
fallback en memoria es suficiente; con varios dynos el contador de Redis es la
fuente de verdad. Si Upstash no responde, la aplicación sigue funcionando con
contadores locales y registra un `WARN` (no se garantiza el límite global durante
esa ventana).

## Observabilidad

Cada llamada pasa por `AiCallExecutor`, que registra en Micrometer:

- `ai.requests{feature, outcome}` — contador de éxito/error por feature.
- `ai.latency{feature}` — timer de latencia (p95/máx. disponible en Actuator).
- `ai.tokens{feature, type=prompt|completion}` — tokens consumidos.
- `ai.cost.usd{feature}` — costo estimado en USD.
- `ai.usage.missing{feature}` — respuestas sin `usage` (proveedor o streaming sin metadata).

Features actuales: `icd10-normalize`, `icd10-rerank`, `records-extract`,
`history-vector`, `history-summary`, `items-suggest`.

Las tarifas viven en `app.ai.pricing` (`application.yml`) y se aplican por modelo;
un modelo desconocido usa la tarifa del modelo por defecto para no perder la señal
de gasto. Cada respuesta con `usage` emite un log estructurado:

```text
ai_usage feature=history-vector model=claude-haiku-4-5-20251001 promptVersion=2026-11-13.1 promptTokens=... completionTokens=... costUsd=...
```

`app.ai.prompt-version` permite correlacionar un cambio de prompt con variaciones
de costo o calidad. En streaming, `AiCallExecutor` acumula el máximo de tokens de
los chunks y registra una sola vez al completar el flujo.

`/actuator/metrics` está expuesto y requiere autenticación. Consulta rápida:

```bash
curl -u admin:admin123 http://localhost:8080/actuator/metrics/ai.tokens
curl -u admin:admin123 http://localhost:8080/actuator/metrics/ai.cost.usd
```

Alertas Prometheus en `ops/alerts/sfm-alerts.yml`: errores de IA, latencia p95,
pico de costo/tokens y respuestas sin `usage`.

## Memoria y streaming de P3

P3 guarda los últimos N turnos por `userId + patientId` en Redis con TTL
(`app.ai.memory.*`). El detalle de claves, aislamiento y eventos SSE está en
`backend/docs/19-ai-p3-consulta-historial-paciente.md`.

- Endpoint compatible: `POST /api/v1/ai/patients/{id}/query`.
- Streaming: `POST /api/v1/ai/patients/{id}/query/stream` (`text/event-stream`).
- Borrar memoria: `DELETE /api/v1/ai/patients/{id}/conversation`.

## AI Lab

`GET /api/v1/ai/lab` (solo ADMIN) es una vista de solo lectura con:

- modelo, versión de prompt, rate limit (distribuido/memoria), TTL y turnos de memoria;
- precios configurados por modelo;
- consumo acumulado por feature (requests, errores, tokens, costo, latencia máxima);
- umbrales de eval versionados.

La página `/ai-lab` del frontend consume ese endpoint. No muestra prompts completos
ni contenido clínico.

## Robustez

- **P4 sin cita:** `ItemSuggestionService` devuelve 422 explicando que la factura no
  tiene cita asociada, en vez de lanzar `NullPointerException`.
- **Reindexación segura:** el documento nuevo se agrega antes de borrar el anterior.
  Si el embedding falla, el expediente conserva su versión previa en el índice.
- **Reintentos:** la reindexación asíncrona reintenta hasta 3 veces.
- **Índice parcial:** `isPatientFullyIndexed` compara documentos indexados contra
  expedientes reales; si falta alguno, la consulta reindexa al paciente.
- **Sin transacción:** `scheduleReindex` reindexa de inmediato en vez de lanzar
  `IllegalStateException` cuando no hay transacción activa.
- **Reparación manual:** `POST /api/v1/ai/patients/{patientId}/reindex` (ADMIN)
  reconstruye el índice y elimina documentos huérfanos.

## Evals

El runner vive en `scripts/ai-eval.py` y calcula métricas con
`scripts/ai-evals/eval_metrics.py` (sin dependencias externas).

| Feature | Dataset | Métricas | Umbrales |
|---|---|---|---|
| P1 CIE-10 | `scripts/ai-evals/icd10-golden.json` | top-1, top-3 | 60 % / 80 % |
| P2 extracción | `scripts/ai-evals/extraction-golden.json` | precisión/recall por entidad, exactitud de catálogo, falsos positivos | 80 % P, 75 % R, 90 % catálogo, ≤20 % FP |
| P4 ítems | `scripts/ai-evals/suggestion-golden.json` | igual, por `itemType` | 80 % P, 75 % R, 90 % catálogo, ≤20 % FP |

Los umbrales son la única fuente de verdad en
`backend/src/main/resources/ai-evals/thresholds.json`; los leen tanto el runner
como `AiLabService`.

```bash
# Manual, contra local
python3 scripts/ai-eval.py --feature icd10
python3 scripts/ai-eval.py --feature extraction
AI_EVAL_INVOICE_HTA=<uuid> AI_EVAL_INVOICE_FARINGITIS=<uuid> \
  python3 scripts/ai-eval.py --feature suggestion
python3 scripts/ai-eval.py --feature all

# Contra producción (cookies httpOnly, no bearer)
AI_EVAL_BASE_URL=https://... AI_EVAL_USER=... AI_EVAL_PASS=... \
  python3 scripts/ai-eval.py --feature all
```

### Decisión: CI vs manual

**Los evals reales quedan manuales** porque consumen cuota de Anthropic/Google y
requieren escenarios clínicos sembrados (una factura por caso de P4). El **cálculo
de métricas sí corre en CI** (`python3 -m unittest discover -s scripts/ai-evals`),
sin red ni secretos: valida precisión/recall, exactitud de catálogo, falsos positivos
y la lógica de umbrales. Antes de un release se ejecuta el gate manual:

```bash
python3 scripts/ai-eval.py --feature all   # exit 1 si baja de umbral
```

El workflow de CI no programa evals con secretos por defecto. Si en el futuro se
quiere un gate automático, debe ser un `workflow_dispatch` con presupuesto y
credenciales explícitas, nunca en cada PR.

## Pendiente

- Subir cobertura de features nuevas si se agregan prompts.
- Presupuesto/cuota por usuario (hoy el límite es por minuto).
- Evaluar cache de respuestas para preguntas repetidas.
