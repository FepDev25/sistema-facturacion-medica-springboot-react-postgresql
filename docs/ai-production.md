# IA en producción

Capa de endurecimiento de los cuatro asistentes AI (P1/P2/P3/P4). El objetivo no es
cambiar los prompts, sino que una llamada al modelo no pueda tumbar el backend ni
degradar la experiencia sin control.

## Guardrails

| Control | Implementación | Config |
|---|---|---|
| Rate limit por usuario | `AiRateLimiter` + `AiRateLimitFilter` (ventana fija de 1 minuto) | `app.ai.rate-limit.requests-per-minute` (20) |
| Timeout | `AiCallExecutor` ejecuta la llamada en un pool y corta a los N segundos | `app.ai.timeout-seconds` (30) |
| Reintento | 1 reintento ante error transitorio; **no** se reintenta un timeout | `app.ai.max-retries` (1) |
| Límite de entrada | Bean Validation en los DTO (`@Size`) | 500 query/pregunta, 8000 notas, 4000 examen, 1000 motivo |
| Determinismo | Temperatura global 0.0 para tareas estructuradas | `spring.ai.anthropic.chat.options.temperature` |
| Respuesta de error | 429 si se excede el límite; 503 si el proveedor falla o expira | `HandlerException` |

El rate limit vive en memoria porque la app corre en un solo dyno. Si se escala
horizontalmente, moverlo a Redis (Upstash ya está disponible).

## Observabilidad

Cada llamada pasa por `AiCallExecutor`, que registra en Micrometer:

- `ai.requests{feature, outcome}` — contador de éxito/error por feature.
- `ai.latency{feature}` — timer de latencia.

Features actuales: `icd10-normalize`, `icd10-rerank`, `records-extract`,
`history-vector`, `history-summary`, `items-suggest`.

Además se emite un log con `feature`, `outcome` y `latencyMs`. Los tokens y el costo
no se registran todavía: Spring AI no los expone de forma uniforme al usar
`entity(...)`; queda como siguiente paso junto con un `ChatResponse` enriquecido.

`/actuator/metrics` está expuesto y requiere autenticación.

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

`scripts/ai-eval.py` corre un dataset dorado contra la API real y calcula top-1 y
top-3 para CIE-10:

```bash
python3 scripts/ai-eval.py --username admin --password admin123
python3 scripts/ai-eval.py --base-url https://... --token "$AI_EVAL_TOKEN"
```

- Dataset: `scripts/ai-evals/icd10-golden.json`.
- Umbrales por defecto: top-1 ≥ 60 %, top-3 ≥ 80 %; si baja, el script sale con 1.
- No corre en CI por defecto porque consume cuota real del proveedor. Se ejecuta como
  gate manual antes de un release o desde un workflow con secretos.

## Pendiente

- Memoria conversacional y streaming en P3.
- Métricas de tokens/costo por request.
- Evals de extracción y sugerencia de ítems (hoy solo CIE-10).
- Rate limit distribuido si se agregan más dynos.
