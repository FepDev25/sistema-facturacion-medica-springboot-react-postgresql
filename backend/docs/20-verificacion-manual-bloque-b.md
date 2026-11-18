# Verificación manual del bloque B — IA de producción

**Fecha:** 2026-11-18
**Entorno:** local — perfil `dev-homelab` (PostgreSQL 17 del homelab vía túnel, Redis del homelab, `ANTHROPIC_API_KEY` real). Backend en `:8092`, frontend Vite en `:5173`.
**Contexto:** el checklist manual de `verificacion-bcd.md` (bloque B) quedó pendiente tras el merge del PR #16. Esta sesión lo ejecutó completo con llamadas reales al proveedor.

## Resultados

| # | Prueba | Resultado | Evidencia |
|---|---|---|---|
| B.1a | Pregunta inicial P3 (paciente María González, `…0001`) | ✅ | Respuesta con diagnósticos (Faringitis aguda J02.9) y prescripciones (Azitromicina, Paracetamol), 2 fuentes citadas con fecha |
| B.1b | Seguimiento dependiente de memoria: "¿Y desde cuándo está tomando ese medicamento?" | ✅ | Resolvió "ese medicamento" a **Azitromicina** (ambiguo sin memoria: la paciente tiene 2 fármacos); respondió 15-ene-2026, 5 días de tratamiento, alta el 23-ene |
| B.1c | Aislamiento entre pacientes: misma pregunta para Diana Castro (`…0007`) | ✅ | Resolvió a su propio **Ketorolaco 10mg** (29-ene-2026); ningún arrastre del turno de María |
| B.1d | Streaming SSE `POST …/query/stream` | ✅ | ~25 eventos `event:token` incrementales + 1 `event:done` con la respuesta completa y fuentes |
| B.1e | Borrado `DELETE …/conversation` | ✅ | 204; la clave Redis del par usuario-paciente desaparece inmediatamente (verificado con `redis-cli --scan`) |
| B.1f | UI del chat de P3 (detalle de paciente) | ✅ | Respuesta transmitida con markdown, input bloqueado en vuelo, botón "Limpiar" presente |
| B.2 | Métricas de tokens/costo | ✅ | Tras 5 consultas reales: 3.560 tokens entrada + 733 salida, **costo total $0.00723**, latencia máx observada 2.112 ms; visibles por feature en AI Lab |
| B.5a | Rate limit distribuido en Redis | ✅ | Clave `sfm:ai:rate:doctor1:<ventana>` presente en el Redis del homelab (no el fallback en memoria) |
| B.5b | AI Lab API (`GET /api/v1/ai/lab`, ADMIN) | ✅ | Modelo `claude-haiku-4-5-20251001`, prompt 2026-11-13.1, rate 20/min distribuido, memoria TTL 1800 s / 6 turnos, pricing $1/$5 por millón, umbrales v1 |
| B.5c | AI Lab UI (`/ai-lab`, ADMIN) | ✅ | Tabla de consumo idéntica a la API; secciones de precios, umbrales y features instrumentadas |
| B.3 | Evals P2/P4 | ⏸ | Golden datasets y umbrales versionados presentes; ejecución real queda manual por costo (como está documentado) |

## Confirmaciones de privacidad

- La memoria conversacional guarda los turnos Q&A **completos en texto plano** en Redis (lista JSON por turno, clave `sfm:ai:conversation:{userId}:{patientId}`), TTL 30 min, máx 6 turnos, borrables por el usuario (204). Decisión aceptable para el alcance de portafolio mientras esté documentada; mitigaciones existentes: TTL corto, aislamiento por usuario+paciente y endpoint de borrado.
- El AI Lab no expone prompts completos ni datos clínicos.
- `/actuator/metrics` está bloqueado por `SecurityConfig` (solo `/actuator/health` público); el consumo de IA se consulta vía AI Lab (ADMIN), que lee el `MeterRegistry` en proceso.

## Hallazgo menor

- **"Latencia máx." es una ventana rodante, no acumulativo.** `AiLabService.latencyMaxMs` usa `Timer.max()` de Micrometer, que es un máximo de ventana (~1-2 min): decae a 0 si no hay tráfico. El subtítulo "Contadores Micrometer desde el último arranque del backend" es correcto para requests/tokens/costo (Counters) pero no para esa columna. Corrección sugerida: aclarar el label ("latencia máx. reciente") o acumular el máximo en un gauge propio.

## Notas operativas de la sesión

- El puerto 8080 local estaba ocupado por otro proyecto; el backend SFM se levantó en `--server.port=8092` y Vite con `VITE_DEV_API_TARGET=http://127.0.0.1:8092`. El filtro de `Origin` exige el puerto estándar (5173) — el frontend debe correr ahí.
- Las 5 consultas de IA de la verificación consumieron en total ~$0.007 (presupuesto de referencia para repetir el drill).
