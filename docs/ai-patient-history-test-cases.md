# Casos de Prueba — P3: Consulta en Lenguaje Natural sobre Historial del Paciente

Endpoint: `POST /api/v1/ai/patients/{patientId}/query`  
Body: `{ "question": "pregunta en lenguaje natural" }`  
Requiere `Authorization: Bearer <token>`.

> **Objetivo de las pruebas:** Validar que el pipeline RAG con filtrado por `patientId` recupera los expedientes relevantes del historial clínico y genera una respuesta útil y fundamentada. Se evalúa: recuperación correcta de información existente, negación correcta de información ausente, respuesta apropiada cuando no hay expedientes, y coherencia de las fuentes citadas.

> **Nota sobre indexación on-demand:** El primer query por paciente dispara la indexación de todos sus expedientes (clinicalNotes + physicalExam + diagnósticos + prescripciones + procedimientos). Las queries subsiguientes usan el vector store. El caso C7 prueba el escenario de paciente sin expedientes.

---

## Pacientes de prueba

| Alias | Nombre | ID | Expedientes | Condiciones destacadas |
|---|---|---|---|---|
| P-Francisco | Francisco Caballero | `7c7c06d9-6940-4b18-9191-3c21541b857f` | 7+ | HTA, Diabetes T2, Artrosis cadera |
| P-Laura | Laura Sánchez Ramírez | `a0000000-0000-0000-0000-000000000005` | 24 | HTA, Diabetes T2, Asma, Hipercolesterolemia, Sinusitis |
| P-Caridad | Caridad Guevara | `44fc1f5f-a11b-4ae6-9c94-bd1ababa6c5f` | 4+ | Diabetes T2, IVU, Hipertiroidismo, Cervicalgia |
| P-Sin-Expedientes | Ana Luisa Tafoya | `044d204a-da27-4c8b-94e3-b4210c562c63` | 0 | — |

---

## Caso 1 — Condición crónica existente (HTA)

**Paciente:** Francisco Caballero (`7c7c06d9-6940-4b18-9191-3c21541b857f`)

**Contexto clínico real en BD:**
- Expediente `2025-10-01`: `I10: Hipertensión esencial (primaria)`
- Expediente `2026-01-26`: `I10.X: Hipertensión arterial no especificada`

**Request:**
```json
{
  "question": "¿El paciente tiene antecedentes de hipertensión arterial?"
}
```

**Resultado esperado:**  
Respuesta afirmativa confirmando HTA. Debe citar al menos uno de los dos expedientes (2025-10-01 o 2026-01-26). No debe inventar diagnósticos adicionales. Las fuentes en `sources[]` deben incluir los `medicalRecordId` de los expedientes con I10/I10.X.

**Output obtenido:**
```json
{
	"answer": "Sí, el paciente tiene antecedentes de hipertensión arterial documentados en múltiples expedientes:\n\n1. **Expediente del 2026-01-26**: Se registra diagnóstico de **Hipertensión arterial no especificada (leve)** con 83 días de evolución.\n\n2. **Expediente del 2025-10-01**: Se documenta diagnóstico de **Hipertensión esencial (primaria) (leve)** con 200 días de evolución.\n\nAmbos diagnósticos están clasificados como MODERATE a MILD en severidad, y en la consulta más reciente (enero 2026) se prescribieron Naproxeno e Insulina glargina como parte del manejo de la hipertensión.",
	"sources": [
		{
			"medicalRecordId": "0f1c8c67-834c-4e73-a5da-780a152e2029",
			"recordDate": "2026-01-20"
		},
		{
			"medicalRecordId": "68dfce7b-4342-4eb1-a1e8-eb307949edb9",
			"recordDate": "2026-01-26"
		},
		{
			"medicalRecordId": "9fcb962e-c52a-4cc5-80b8-4c52c5aea138",
			"recordDate": "2024-12-22"
		},
		{
			"medicalRecordId": "3db08d80-c464-494f-839b-64b730c08283",
			"recordDate": "2025-04-21"
		},
		{
			"medicalRecordId": "e13946f7-1555-4dc7-b492-3acbfaeb87d7",
			"recordDate": "2025-07-24"
		},
		{
			"medicalRecordId": "3bfa0182-1afb-4a86-a6bd-13a4759e08ee",
			"recordDate": "2025-10-01"
		}
	]
}
```

**Tiempo de respuesta (ms):** 3.17s

**Evaluación:** ✅ Correcto. Ambos expedientes con HTA identificados y citados explícitamente (2026-01-26 con I10.X y 2025-10-01 con I10). Las fuentes `sources[]` incluyen los dos `medicalRecordId` correctos. Sin alucinación: los medicamentos mencionados (Naproxeno, Insulina glargina) corresponden al expediente 2026-01-26 que efectivamente contiene ambas prescripciones. Leve imprecisión: el model dice "MODERATE a MILD" — en las notas clínicas el texto dice "leve" pero el dato proviene literalmente del texto del documento indexado, no es invención.

---

## Caso 2 — Historial de medicamentos para una condición

**Paciente:** Francisco Caballero (`7c7c06d9-6940-4b18-9191-3c21541b857f`)

**Contexto clínico real en BD:**
- Expediente `2024-09-30` (E11.9 Diabetes): Paracetamol 500mg + Fenitoína 100mg
- Expediente `2026-01-26` (I10.X HTA): Insulina glargina 100UI/mL + Naproxeno 250mg
- Expediente `2024-10-23` (Caridad, distinto paciente — solo de referencia)

> La insulina glargina fue prescrita en un expediente con diagnóstico HTA, no diabetes — punto interesante para evaluar si el modelo recupera el medicamento correctamente.

**Request:**
```json
{
  "question": "¿Qué medicamentos se han prescrito para el manejo de la diabetes?"
}
```

**Resultado esperado:**  
El modelo debe mencionar medicamentos del historial relacionados con diabetes o manejo metabólico. La Insulina glargina aparece en el expediente más reciente aunque el diagnóstico era HTA — evaluar si el modelo recupera ese contexto o solo menciona los del expediente con E11.9. No debe inventar Metformina u otros medicamentos que no están en el historial de este paciente.

**Output obtenido:**
```json
{
	"answer": "Basándome en los expedientes clínicos proporcionados, el medicamento prescrito específicamente para el manejo de la diabetes es:\n\n**Insulina glargina 100UI/mL** — prescrita en el expediente del 2026-01-26, con dosificación de 25mg cada 12 horas, cada 24 horas por 14 días.\n\n**Nota importante:** Aunque el paciente fue diagnosticado con Diabetes mellitus tipo 2 sin complicaciones en el expediente del 2024-09-30, en esa ocasión se prescribió **Paracetamol 500mg y Fenitoína 100mg**, que no son medicamentos específicos para el control glucémico de la diabetes. La Insulina glargina aparece recién en el expediente más reciente (2026-01-26), aunque fue prescrita en el contexto de un diagnóstico de hipertensión arterial.",
	"sources": [
		{
			"medicalRecordId": "9fb0a35e-28ab-4520-ac92-ec2f75b896ce",
			"recordDate": "2024-09-30"
		},
		{
			"medicalRecordId": "3db08d80-c464-494f-839b-64b730c08283",
			"recordDate": "2025-04-21"
		},
		{
			"medicalRecordId": "3bfa0182-1afb-4a86-a6bd-13a4759e08ee",
			"recordDate": "2025-10-01"
		},
		{
			"medicalRecordId": "9fcb962e-c52a-4cc5-80b8-4c52c5aea138",
			"recordDate": "2024-12-22"
		},
		{
			"medicalRecordId": "68dfce7b-4342-4eb1-a1e8-eb307949edb9",
			"recordDate": "2026-01-26"
		},
		{
			"medicalRecordId": "0f1c8c67-834c-4e73-a5da-780a152e2029",
			"recordDate": "2026-01-20"
		}
	]
}
```

**Tiempo de respuesta (ms):** 2.78s

**Evaluación:** ✅ Excelente. Fidelidad total al historial: menciona solo Insulina glargina y Paracetamol/Fenitoína, que son exactamente las prescripciones en los dos expedientes con diagnóstico de diabetes o manejo metabólico. Crucialmente, **no inventa Metformina** (que sí existe en el catálogo pero no fue prescrita a este paciente). El análisis espontáneo del modelo — señalar que Paracetamol y Fenitoína "no son medicamentos específicos para el control glucémico" y que la Insulina "fue prescrita en un contexto de HTA" — demuestra razonamiento clínico correcto sobre el contexto de los expedientes recuperados.

---

## Caso 3 — Condición ausente (pregunta negativa)

**Paciente:** Caridad Guevara (`44fc1f5f-a11b-4ae6-9c94-bd1ababa6c5f`)

**Contexto clínico real en BD:**
- Diagnósticos registrados: E11.9 (Diabetes T2), N39.0 (IVU), J02.9 (Faringitis), E05.9 (Hipertiroidismo), M54.2 (Cervicalgia), J06.9 (IVAS), M80.0 (Osteoporosis)
- **No hay ningún diagnóstico de HTA (I10/I10.X) en ningún expediente**

**Request:**
```json
{
  "question": "¿Tiene el paciente diagnóstico de hipertensión arterial?"
}
```

**Resultado esperado:**  
Respuesta negativa clara: no se registra HTA en el historial disponible. El modelo **no debe** inventar un diagnóstico de HTA ni especular. Si el vector search no recupera expedientes relacionados con HTA, la respuesta debe basarse en esa ausencia. `sources[]` puede estar vacío o contener expedientes de otras condiciones recuperados por similitud.

**Output obtenido:**
```json
{
	"answer": "Basándome en la revisión completa del historial clínico proporcionado, **no hay diagnóstico de hipertensión arterial** registrado en ninguno de los expedientes del paciente.\n\nLos diagnósticos documentados incluyen:\n- Cervicalgia\n- Prostatitis aguda\n- Infección de vías urinarias\n- Diabetes mellitus tipo 2\n- Hipertiroidismo\n- Infección aguda de vías respiratorias superiores\n- Faringitis aguda\n- Osteoporosis postmenopáusica con fractura patológica\n\nLa hipertensión arterial no aparece entre los diagnósticos registrados en las consultas de 2024, 2025 ni 2026.",
	"sources": [
		{
			"medicalRecordId": "877eb5e2-9039-4a5b-847d-4fa784116a23",
			"recordDate": "2025-06-20"
		},
		{
			"medicalRecordId": "08607e23-96e8-4d24-81f6-4e082387eb14",
			"recordDate": "2024-05-20"
		},
		{
			"medicalRecordId": "7a6fa371-68d7-42f6-b2d9-ac5aaca008b0",
			"recordDate": "2024-10-23"
		},
		{
			"medicalRecordId": "10f968c0-86f5-45f5-acbf-bf067fb2dc2b",
			"recordDate": "2026-02-12"
		}
	]
}
```

**Tiempo de respuesta (ms):** 3.78s

**Evaluación:** ✅ Correcto. Negación explícita y sin especulación: "no hay diagnóstico de hipertensión arterial registrado en ninguno de los expedientes". El modelo lista los diagnósticos reales del paciente (Cervicalgia, IVU, Diabetes, Hipertiroidismo, etc.), todos verificables en BD, sin agregar HTA de ninguna forma. Los 4 `sources[]` corresponden a los 4 expedientes reales de Caridad — el vector search recuperó el historial completo disponible para este paciente, lo que permitió al modelo hacer una afirmación de ausencia con buena base.

---

## Caso 4 — Procedimientos y estudios realizados

**Paciente:** Francisco Caballero (`7c7c06d9-6940-4b18-9191-3c21541b857f`)

**Contexto clínico real en BD (procedimientos registrados):**
- `2026-01-26`: Mamografía bilateral de detección, Radiografía de tórax 2 vistas
- `2026-01-20`: Ultrasonido obstétrico primer trimestre
- `2025-10-01`: Colonoscopia diagnóstica
- `2025-07-24`: Endoscopia gástrica superior (EGD) diagnóstica
- `2025-04-21`: Radiografía de rodilla 3 vistas

**Request:**
```json
{
  "question": "¿Qué estudios diagnósticos o procedimientos se han realizado a este paciente?"
}
```

**Resultado esperado:**  
Lista de procedimientos extraídos del historial, con fechas aproximadas. El vector search con topK=6 puede no recuperar todos los expedientes con procedimientos (el paciente tiene 7+ registros), por lo que es aceptable una respuesta parcial. Evaluar cuántos procedimientos reales menciona vs. cuántos inventa.

**Output obtenido:**
```json
{
	"answer": "# Estudios Diagnósticos y Procedimientos Realizados\n\nSegún los expedientes clínicos, se han realizado los siguientes procedimientos:\n\n## Procedimientos Registrados:\n\n1. **Ultrasonido obstétrico, primer trimestre** (Código 76830)\n   - Fecha: 2026-01-20\n\n2. **Colonoscopia diagnóstica** (Código 45378)\n   - Fecha: 2025-10-01\n\n3. **Radiografía de rodilla, 3 vistas** (Código 73650)\n   - Fecha: 2025-04-21\n\n4. **Radiografía de tórax, 2 vistas** (Código 71046)\n   - Fecha: 2026-01-26\n\n5. **Mamografía bilateral de detección** (Código 77067)\n   - Fecha: 2026-01-26\n\n**Nota:** No se documentan hallazgos específicos o resultados de estos procedimientos en los expedientes proporcionados.",
	"sources": [
		{
			"medicalRecordId": "9fcb962e-c52a-4cc5-80b8-4c52c5aea138",
			"recordDate": "2024-12-22"
		},
		{
			"medicalRecordId": "0f1c8c67-834c-4e73-a5da-780a152e2029",
			"recordDate": "2026-01-20"
		},
		{
			"medicalRecordId": "3bfa0182-1afb-4a86-a6bd-13a4759e08ee",
			"recordDate": "2025-10-01"
		},
		{
			"medicalRecordId": "3db08d80-c464-494f-839b-64b730c08283",
			"recordDate": "2025-04-21"
		},
		{
			"medicalRecordId": "68dfce7b-4342-4eb1-a1e8-eb307949edb9",
			"recordDate": "2026-01-26"
		},
		{
			"medicalRecordId": "9fb0a35e-28ab-4520-ac92-ec2f75b896ce",
			"recordDate": "2024-09-30"
		}
	]
}
```

**Tiempo de respuesta (ms):** 5.72s

**Evaluación:** ✅ Correcto (L1 reclasificado — los códigos son datos legítimos). Los 5 procedimientos listados son reales y sus fechas corresponden exactamente a los expedientes en BD. Los códigos CPT (76830, 45378, 73650, 71046, 77067) aparecen porque el campo `procedureCode` de la tabla `procedures` los almacena y `buildDocumentText` los incluye en el texto indexado: la regla del system prompt era innecesaria para este caso. El procedimiento faltante — **Endoscopia gástrica superior (2025-07-24)** — quedó fuera porque topK dinámico = 6 para Francisco (≤8 expedientes indexados), y ese es el séptimo expediente que el similarity search no priorizó. Cobertura: 5/6 procedimientos con código + descripción correctos. El topK dinámico no mejora el recall aquí (el paciente solo tiene 7 expedientes y topK=6 siempre perderá uno), pero la penalización es mínima. Tiempo: 5.72s vs. 2.75s anterior — la diferencia refleja el re-procesamiento con el vector store actualizado.

---

## Caso 5 — Consulta temporal (fecha del último evento)

**Paciente:** Laura Sánchez Ramírez (`a0000000-0000-0000-0000-000000000005`)

**Contexto clínico real en BD:**
- Expediente `2025-09-28`: `J45.20: Asma bronquial no especificada, sin complicaciones` — único expediente con asma en la BD

**Request:**
```json
{
  "question": "¿Cuándo fue el último diagnóstico de asma registrado?"
}
```

**Resultado esperado:**  
El modelo debe identificar el expediente del `2025-09-28` como la referencia más reciente con diagnóstico de asma (J45.20). La fecha debe aparecer en la respuesta o en `sources[]`. Laura tiene 24 expedientes — el indexador cargará todos en el primer query (primera vez que se consulta este paciente), lo que puede incrementar el tiempo de respuesta inicial.

> Este caso también mide el tiempo de indexación on-demand: Laura tiene 24 expedientes, lo que implica 24 × (1 embedding call) en el primer query.

**Output obtenido:**
```json
{
	"answer": "Según los expedientes clínicos proporcionados, el último diagnóstico de asma registrado fue el **28 de septiembre de 2025** (2025-09-28).\n\nEn esa fecha se documentó:\n- **Diagnóstico**: J45.20 - Asma bronquial no especificada, sin complicaciones [MILD]\n- **Presentación clínica**: Palpitaciones cardiacas frecuentes con síntomas de asma bronquial de 202 días de evolución, sin mejoría con medidas caseras.",
	"sources": [
		{
			"medicalRecordId": "8b6f03b3-1d5a-44ce-a408-4e58515a3373",
			"recordDate": "2024-09-16"
		},
		{
			"medicalRecordId": "8a8417fb-4bd0-49f8-837d-5593ac5e2682",
			"recordDate": "2025-09-29"
		},
		{
			"medicalRecordId": "e53868b3-6f8d-46c0-9661-8ac45954bbf5",
			"recordDate": "2025-09-29"
		},
		{
			"medicalRecordId": "dc05924b-6177-497e-a4d8-d9199ddb0ac2",
			"recordDate": "2025-09-28"
		},
		{
			"medicalRecordId": "2c8a1cc7-fe31-40b6-93d9-a3dc35c79148",
			"recordDate": "2025-08-18"
		},
		{
			"medicalRecordId": "cdf9d4e2-a47f-4477-ab31-b70d69e482cf",
			"recordDate": "2025-08-18"
		}
	]
}
```

**Tiempo de respuesta (ms):** 7.94s *(primer query — incluye indexación on-demand de 24 expedientes)*

**Evaluación:** ✅ Correcto. Fecha `2025-09-28` identificada correctamente. El expediente `dc05924b` con J45.20 está presente en `sources[]`. La descripción clínica del asma es fiel al texto del expediente. Los 7.94s reflejan el costo de la indexación on-demand de los 24 expedientes de Laura — el vector search y la generación posterior son del orden de los otros casos (2-3s). Queries subsiguientes sobre este mismo paciente no pagarán ese costo.

---

## Caso 6 — Resumen de condiciones crónicas del paciente

**Paciente:** Laura Sánchez Ramírez (`a0000000-0000-0000-0000-000000000005`)

**Contexto clínico real en BD (diagnósticos únicos registrados):**
`I10.X` HTA, `E11.9` Diabetes T2, `J45.20` Asma, `E78.0` Hipercolesterolemia, `J32.9` Sinusitis crónica, `M54.5` Dolor lumbar, `K26.9` Úlcera duodenal, `L03.311` Celulitis pierna derecha, `M16.11` Artrosis cadera, entre otros.

**Request:**
```json
{
  "question": "¿Cuáles son las condiciones crónicas o recurrentes conocidas de esta paciente?"
}
```

**Resultado esperado:**  
Lista de condiciones crónicas o recurrentes identificadas en el historial. Las crónicas claras son: HTA, Diabetes T2, Asma, Hipercolesterolemia, Sinusitis crónica. El modelo debe basarse solo en los expedientes recuperados (topK=6 de 24 disponibles) y no inventar condiciones. Evaluar coherencia entre lo que dice y lo que contienen las fuentes en `sources[]`.

**Output obtenido:**
```json
{
	"answer": "# Condiciones Crónicas o Recurrentes del Paciente\n\nBasándome en el historial clínico proporcionado (junio 2024 - septiembre 2025), las condiciones crónicas o recurrentes documentadas son:\n\n## **Condiciones Crónicas:**\n1. **Diabetes mellitus tipo 2** sin complicaciones\n2. **Hipertensión arterial**\n3. **Hipercolesterolemia pura**\n4. **Asma bronquial** no especificada, sin complicaciones\n5. **Sinusitis crónica** no especificada\n6. **Artrosis primaria de cadera derecha**\n7. **Hiperplasia de próstata** sin inflamación\n8. **Polineuropatía** no especificada\n9. **Úlcera duodenal** no especificada\n\n## **Condiciones Recurrentes (múltiples consultas):**\n- **Conjuntivitis aguda atópica** (2 consultas)\n- **Nasofaringitis aguda/resfriado común** (2 consultas)\n- **Celulitis de la pierna derecha** (2 consultas)\n- **Prostatitis aguda** (2 consultas)\n- **Tos** (5 consultas registradas en total)\n- **Mareo y desequilibrio** (3 consultas)\n- **Estreñimiento** (2 consultas)\n- **Dolor de pecho** (2 consultas)\n\nEl paciente está bajo tratamiento farmacológico para sus condiciones crónicas con antihipertensivos (amlodipino, enalapril, espironolactona), antihistamínicos y broncodilatadores, entre otros.",
	"sources": [
		{
			"medicalRecordId": "e53868b3-6f8d-46c0-9661-8ac45954bbf5",
			"recordDate": "2025-09-29"
		},
		{
			"medicalRecordId": "8a8417fb-4bd0-49f8-837d-5593ac5e2682",
			"recordDate": "2025-09-29"
		},
		{
			"medicalRecordId": "6a3a1a67-8959-4fb5-bbcf-8abf100c5fe0",
			"recordDate": "2025-09-29"
		},
		{
			"medicalRecordId": "dc05924b-6177-497e-a4d8-d9199ddb0ac2",
			"recordDate": "2025-09-28"
		},
		{
			"medicalRecordId": "870c1db7-5542-4ddc-9f91-3020e3bdf18c",
			"recordDate": "2025-09-23"
		},
		{
			"medicalRecordId": "6f3073b8-e78b-4449-807a-f0f9a28895b4",
			"recordDate": "2025-09-23"
		}
	]
}
```

**Tiempo de respuesta (ms):** 4.19s

**Evaluación:** ✅ Correcto (L2 resuelto). El fix B+A funcionó: la query "condiciones crónicas" → normalizada a "condiciones cronicas" → match en `SUMMARY_PATTERNS` → ruta a `queryWithStructuredContext` con contexto completo desde BD. Las 5 condiciones crónicas principales ahora están presentes: **HTA, Diabetes T2, Asma, Hipercolesterolemia, Sinusitis crónica**. Adicionalmente se identificaron 4 condiciones adicionales (Artrosis cadera, Hiperplasia próstata, Polineuropatía, Úlcera duodenal) y 8 condiciones recurrentes con conteo de consultas — todo extraído del historial real. El contexto de tratamiento (amlodipino, enalapril, espironolactona para HTA) también es correcto. Los `sources[]` muestran los 6 expedientes más recientes de la paciente — son referencia, el contexto real vino de las 4 consultas a BD en `buildSummaryContext`. Tiempo: 4.19s vs. 3.3s anterior, diferencia atribuible a las 4 queries de BD en lugar del vector search. Sin alucinación. L2 completamente resuelto para queries de resumen y listado.

---

## Caso 7 — Paciente sin expedientes registrados

**Paciente:** Ana Luisa Tafoya (`044d204a-da27-4c8b-94e3-b4210c562c63`)

**Contexto:** Paciente existe en la BD pero no tiene ningún `medical_record` asociado. El indexador no encontrará registros para indexar y el vector store no tendrá documentos con su `patientId`.

**Request:**
```json
{
  "question": "¿Tiene antecedentes de diabetes?"
}
```

**Resultado esperado:**  
El servicio retorna la respuesta de fallback: `"No se encontraron expedientes clínicos relevantes para esta consulta."` con `sources: []`. No debe lanzar excepción ni error 500.

**Output obtenido:**
```json
{
	"answer": "No se encontraron expedientes clínicos relevantes para esta consulta.",
	"sources": []
}
```

**Tiempo de respuesta (ms):** 139ms

**Evaluación:** ✅ Fallback perfecto. La respuesta fija de "No se encontraron expedientes clínicos relevantes" se retorna limpiamente con `sources: []`, sin error ni excepción. Los 139ms reflejan: validación de existencia del paciente en BD + verificación JDBC de que no hay registros indexados + early return sin llamada LLM. Comportamiento correcto para el caso de borde más importante del sistema.

---

## Tabla resumen

| Caso | Paciente | Pregunta | Resultado | Tiempo | Observación clave |
|---|---|---|---|---|---|
| C1 | Francisco | Antecedentes HTA | ✅ Correcto | 3.17s | Ambos expedientes HTA citados, sin invención |
| C2 | Francisco | Medicamentos diabetes | ✅ Correcto | 2.78s | Razonamiento clínico espontáneo sobre contexto prescripción vs. diagnóstico |
| C3 | Caridad | HTA (ausente) | ✅ Correcto | 3.78s | Negación explícita + diagnósticos reales listados |
| C4 | Francisco | Procedimientos realizados | ✅ Correcto | 5.72s | 5/6 procedimientos; códigos CPT son datos de BD, no alucinación (L1 reclasificado) |
| C5 | Laura | Último diagnóstico asma | ✅ Correcto | 7.94s* | Fecha exacta, *incluye indexación on-demand de 24 expedientes |
| C6 | Laura | Condiciones crónicas | ✅ Correcto | 4.19s | L2 resuelto: bypass a BD completa vía `isSummaryQuery` — HTA/Diabetes/Asma presentes |
| C7 | Ana Luisa | Sin expedientes | ✅ Correcto | 139ms | Fallback limpio, sin LLM call |

---

## Conclusiones

**Resultado final: 7/7 correctos, 0 parciales, 0 fallos.**

### Fortalezas observadas

- **Negación sin alucinación (C3)**: el modelo responde "no hay diagnóstico de HTA" de forma concluyente basado en los expedientes recuperados, sin especular ni inventar. Este es el comportamiento más difícil de garantizar en RAG y fue correcto.
- **Razonamiento contextual (C2)**: identificó que la Insulina glargina fue prescrita en un expediente con diagnóstico de HTA, no de diabetes, y lo señaló espontáneamente — análisis correcto sin instrucción explícita en el prompt.
- **Fallback limpio (C7)**: sin expedientes, el sistema retorna el mensaje de fallback sin error y sin llamar al LLM — 139ms.
- **Indexación on-demand funcional (C5)**: primer query de Laura (24 expedientes) completado en 7.94s incluyendo indexación. Queries subsiguientes del mismo paciente no pagan ese costo.
- **Resumen completo con bypass a BD (C6)**: la clasificación de intención por patrones + ruta estructurada garantiza cobertura total para queries de listado, independientemente del topK y del tamaño del historial.
- **Datos de procedimientos fieles a BD (C4)**: los códigos CPT que aparecen provienen del campo `procedure_code` indexado — no son alucinación. La fidelidad al contexto indexado es alta.

### Análisis de limitaciones (historial)

**L1 — Reclasificado (C4):** Los códigos CPT (76830, 45378, etc.) provienen del campo `procedureCode` de la tabla `procedures`, indexado explícitamente en `buildDocumentText`. La etiqueta "alucinación" era incorrecta — el modelo reprodujo datos reales del expediente. La regla añadida al system prompt es un buen guardrail preventivo para casos donde el modelo *sí* pudiera inferir códigos no presentes, pero no era la causa del comportamiento en C4.

**L2 — Resuelto (C6):** La arquitectura dual (vector search para queries específicas + bypass a BD para queries de resumen) resuelve estructuralmente el problema del topK insuficiente para historiales amplios. El clasificador de 44 patrones con normalización NFD cubre las variantes coloquiales y formales de las queries de resumen más comunes.

### Correcciones aplicadas

| # | Limitación | Estado |
|---|---|---|
| L1 | Códigos CPT en output | ✅ Reclasificado — datos reales de BD, no alucinación. System prompt rule aplicada como guardrail preventivo. |
| L2 | topK insuficiente para resumen | ✅ Resuelto — arquitectura dual: topK dinámico (Ruta A) + bypass a BD completa para queries de resumen (Ruta B). |
