# Casos de Prueba — Extracción de Notas Clínicas (P2)

`POST /api/v1/ai/records/extract`

Casos extraídos de datos reales del sistema. Ejecutar en Insomnia con token Bearer activo.
Completar la sección **Output** de cada caso después de ejecutarlo.

---

## TC-01 — Caso base: un medicamento, diagnóstico claro

**Qué evalúa:** extracción mínima funcional — 1 diagnóstico + 1 prescripción. Baseline para comparar el resto.

**Input:**
```json
{
  "appointmentId": "a8e6c6b9-2173-4d74-83e5-235f76e36369",
  "medicalRecordId": "4e3ddf4e-4367-41fb-b860-31f7e0dc7d9b",
  "clinicalNotes": "Paciente de 35 años se presenta por Dolor de oido derecho con secrecion y sintomas de ulcera duodenal, no especificada como aguda o cronica, sin hemorragia ni perforacion (leve) de 102 dias de evolucion de evolución. A la exploración física destaco Paciente en regular estado general. Diagnóstico presuntivo: Ulcera duodenal, no especificada como aguda o cronica, sin hemorragia ni perforacion. Se inicia Montelukast 10mg, sugiriendo 4 días de reposo relativo y seguimiento en 11 días.",
  "physicalExam": "Paciente consciente, orientado",
  "chiefComplaint": "Dolor de oido derecho con secrecion"
}
```

**Qué esperar:**
- Diagnóstico: Úlcera duodenal → ICD-10 debería ser `K26.9`
- Prescripción: Montelukast 10mg con `matchedMedicationId` resuelto
- Procedimientos: vacío

**Output:**
```json
{
	"diagnoses": [
		{
			"icd10Code": "K26.9",
			"description": "Ulcera duodenal, no especificada como aguda o cronica, sin hemorragia ni perforacion",
			"severity": "mild"
		}
	],
	"prescriptions": [
		{
			"medicationName": "Montelukast 10mg",
			"matchedMedicationId": "df6a157c-ac6e-47a8-89f2-f575619e9307",
			"dosage": "10mg",
			"frequency": "una vez al día",
			"durationDays": 11,
			"instructions": "Reposo relativo por 4 días, seguimiento en 11 días"
		}
	],
	"procedures": []
}
```

**Evaluación:** ✅ ICD-10 `K26.9` correcto. UUID resuelto. `frequency` inferida (no está en el texto) — alucinación leve. `durationDays: 11` tomó los días de seguimiento en vez de la duración del medicamento — error sistemático que se repite en todos los casos.

---

## TC-02 — Dos medicamentos, diagnóstico de alto peso clínico

**Qué evalúa:** múltiples prescripciones + diagnóstico grave (infarto) con ICD-10 específico.

**Input:**
```json
{
  "appointmentId": "48b154a6-64b0-41c1-a2fb-f56b75311652",
  "medicalRecordId": "8849e293-3b6c-49b6-b144-3f726c64678b",
  "clinicalNotes": "Paciente de 35 años se presenta por Dolor en el pecho al respirar despues de una cirugia reciente y sintomas de infarto agudo del miocardio transmural de localizacion no especificada (leve) de 71 dias de evolucion de evolución. A la exploración física destaco Paciente en regular estado general. Diagnóstico presuntivo: Infarto agudo del miocardio transmural de localizacion no especificada. Se inicia Metoclopramida 10mg, Clopidogrel 75mg, sugiriendo 9 días de reposo relativo y seguimiento en 13 días.",
  "physicalExam": "Paciente en regular estado general",
  "chiefComplaint": "Dolor en el pecho al respirar despues de una cirugia reciente"
}
```

**Qué esperar:**
- Diagnóstico: Infarto agudo del miocardio transmural → ICD-10 debería ser `I21.9`
- Prescripciones: Metoclopramida 10mg + Clopidogrel 75mg, ambas con UUID resuelto
- Procedimientos: vacío
- Punto de interés: el chief complaint (dolor post-cirugía) no coincide con el diagnóstico — ¿extrae el diagnóstico correcto de las notas y no del chief complaint?

**Output:**
```json
{
	"diagnoses": [
		{
			"icd10Code": "I21.9",
			"description": "Infarto agudo del miocardio transmural de localizacion no especificada",
			"severity": "mild"
		}
	],
	"prescriptions": [
		{
			"medicationName": "Metoclopramida 10mg",
			"matchedMedicationId": "95971e16-bf8e-4609-a642-db701959819c",
			"dosage": "10mg",
			"frequency": "No especificada",
			"durationDays": 9,
			"instructions": "Reposo relativo"
		},
		{
			"medicationName": "Clopidogrel 75mg",
			"matchedMedicationId": "8d1f7457-7936-4ea1-a0aa-3df392f636f3",
			"dosage": "75mg",
			"frequency": "No especificada",
			"durationDays": 9,
			"instructions": "Reposo relativo"
		}
	],
	"procedures": []
}
```

**Evaluación:** ✅ ICD-10 `I21.9` correcto. Ambos UUIDs resueltos. Bonus: el LLM devolvió `frequency: "No especificada"` en vez de inventar — comportamiento honesto. Chief complaint vs diagnóstico: extrajo correctamente de las notas clínicas ignorando el chief complaint irrelevante. `durationDays: 9` nuevamente tomó los días de reposo.

---

## TC-03 — Edge case: sin medicamentos nombrados

**Qué evalúa:** cuando las notas dicen "medicamentos segun receta" sin especificar — el LLM NO debería extraer prescripciones.

**Input:**
```json
{
  "appointmentId": "3f49ba90-8dfa-4f1c-86bc-22f82b9f26f2",
  "medicalRecordId": "0b302c5e-81af-4454-b386-1aa6726cd866",
  "clinicalNotes": "Se evalúa paciente de 35 años debido a Dolor en el pecho que empeora con la respiracion profunda con sintomas de infeccion aguda de las vias respiratorias superiores, no especificada (leve) desde hace 217 dias de evolucion. Durante la valoración identifico Paciente en buen estado general. Sospecho de Infeccion aguda de las vias respiratorias superiores, no especificada. Procedo a prescribir medicamentos segun receta, recomendando 5 días de reposo y control en 20 días.",
  "physicalExam": "Paciente consciente, orientado",
  "chiefComplaint": "Dolor en el pecho que empeora con la respiracion profunda"
}
```

**Qué esperar:**
- Diagnóstico: Infección aguda vías respiratorias superiores → ICD-10 debería ser `J06.9`
- Prescripciones: **lista vacía** — no hay medicamentos explícitos
- Procedimientos: vacío
- Punto crítico: si el LLM inventa medicamentos aquí, es una alucinación grave

**Output:**
```json
{
	"diagnoses": [
		{
			"icd10Code": "J06.9",
			"description": "Infección aguda de las vías respiratorias superiores, no especificada",
			"severity": "mild"
		}
	],
	"prescriptions": [],
	"procedures": []
}
```

**Evaluación:** ✅✅ Caso crítico superado. ICD-10 `J06.9` correcto. Prescripciones vacías — el LLM no inventó medicamentos ante "medicamentos segun receta". Sin alucinaciones.

---

## TC-04 — Medicamento tópico (gel) + diagnóstico metabólico

**Qué evalúa:** formato de medicamento no estándar (gel tópico) y si el nombre exacto del catálogo se resuelve correctamente.

**Input:**
```json
{
  "appointmentId": "8f4aed63-ce06-4554-bf99-7becbef49b36",
  "medicalRecordId": "eac0432b-c36a-497a-9175-3d434153041c",
  "clinicalNotes": "Consulta de paciente de 35 años por Dolor en el testiculo derecho con inflamacion asociado a sintomas de diabetes mellitus tipo 2 con hiperhiperglucemia (leve) de 201 dias de evolucion de evolución. En la valoración física observo Paciente en regular estado general. Considero como diagnóstico presuntivo Diabetes mellitus tipo 2 con hiperhiperglucemia. Se instaura Doxiciclina 100mg, Diclofenaco Gel 1%, otorgando 4 días de reposo y revaloración en 29 días.",
  "physicalExam": "Paciente alerta, cooperador",
  "chiefComplaint": "Dolor en el testiculo derecho con inflamacion"
}
```

**Qué esperar:**
- Diagnóstico: Diabetes mellitus tipo 2 → ICD-10 debería ser `E11.65` o similar
- Prescripciones: Doxiciclina 100mg + Diclofenaco Gel 1%, ambas con UUID resuelto
- Punto de interés: "Diclofenaco Gel 1%" es un nombre con formato especial — ¿coincide exacto con el catálogo?

**Output:**
```json
{
	"diagnoses": [
		{
			"icd10Code": "E11.9",
			"description": "Diabetes mellitus tipo 2 con hiperhiperglucemia",
			"severity": "mild"
		}
	],
	"prescriptions": [
		{
			"medicationName": "Doxiciclina 100mg",
			"matchedMedicationId": "7638ee72-6fbc-41b0-8cdb-875cc7325f52",
			"dosage": "100mg",
			"frequency": "Según indicación médica",
			"durationDays": 4,
			"instructions": "Reposo de 4 días, revaloración en 29 días"
		},
		{
			"medicationName": "Diclofenaco Gel 1%",
			"matchedMedicationId": "f0000000-0000-0000-0000-000000000015",
			"dosage": "1%",
			"frequency": "Según indicación médica",
			"durationDays": 4,
			"instructions": "Aplicación tópica, reposo de 4 días"
		}
	],
	"procedures": []
}
```

**Evaluación:** ✅ ICD-10 `E11.9` aceptable (el más específico sería `E11.65` para "con hiperglucemia" — diferencia menor). Diclofenaco Gel 1% coincidió exacto con el catálogo. Bonus: `instructions` incluye "Aplicación tópica" para el gel — el LLM infirió la vía de administración correctamente.

---

## TC-05 — Diagnóstico endocrinológico + medicamentos cardiovasculares

**Qué evalúa:** combinación diagnóstico-medicamento clínicamente coherente (esteatosis hepática + estatina + antihipertensivo).

**Input:**
```json
{
  "appointmentId": "162140f5-1fbb-492e-9b74-ddc9b13b508d",
  "medicalRecordId": "f71f3279-18e6-4bc5-8f06-c587b1ddb530",
  "clinicalNotes": "Paciente masculino de 35 años que acude a consulta por Fiebre en nino menor de 3 anos. Refiere sintomas de esteatosis hepatica no alcohólica (leve) con 350 dias de evolucion de evolución. A la exploración física destaca Paciente en regular estado general. Impresión diagnóstica: Esteatosis hepatica no alcohólica. Se inicia Losartán 50mg, Atorvastatina 40mg con indicación de reposo relativo por 4 días y cita de seguimiento en 24 días.",
  "physicalExam": "Paciente con facie de ansiedad",
  "chiefComplaint": "Fiebre en nino menor de 3 anos"
}
```

**Qué esperar:**
- Diagnóstico: Esteatosis hepática no alcohólica → ICD-10 debería ser `K76.0`
- Prescripciones: Losartán 50mg + Atorvastatina 40mg, ambas con UUID resuelto
- Punto de interés: chief complaint (fiebre en niño) no tiene relación con el diagnóstico registrado — ¿el LLM extrae el diagnóstico de las notas y no del chief complaint?

**Output:**
```json
{
	"diagnoses": [
		{
			"icd10Code": "K76.0",
			"description": "Esteatosis hepatica no alcohólica",
			"severity": "mild"
		}
	],
	"prescriptions": [
		{
			"medicationName": "Losartán 50mg",
			"matchedMedicationId": "f0000000-0000-0000-0000-000000000007",
			"dosage": "50mg",
			"frequency": "una vez al día",
			"durationDays": 4,
			"instructions": "Reposo relativo por 4 días"
		},
		{
			"medicationName": "Atorvastatina 40mg",
			"matchedMedicationId": "c3c5e7e2-1590-4e03-bc1f-27c6090330a1",
			"dosage": "40mg",
			"frequency": "una vez al día",
			"durationDays": 4,
			"instructions": "Reposo relativo por 4 días"
		}
	],
	"procedures": []
}
```

**Evaluación:** ✅ ICD-10 `K76.0` perfecto. Ambos UUIDs resueltos. Chief complaint (fiebre en niño) totalmente irrelevante — el LLM lo ignoró y extrajo el diagnóstico correcto de las notas. `durationDays: 4` error sistemático de siempre.

---

## TC-06 — Edge case: mismo medicamento duplicado en las notas

**Qué evalúa:** comportamiento del LLM cuando un medicamento aparece dos veces en el texto — ¿extrae dos entradas o colapsa a una?

**Input:**
```json
{
  "appointmentId": "3a825900-40c7-43f8-9493-fcb2e9322916",
  "medicalRecordId": "c9d631e1-c49a-4296-9ea6-11e0dbb49593",
  "clinicalNotes": "Consulta de paciente de 35 años por Nauseas y mareos matutinos constantes junto con sintomas de dermatitis, no especificada (leve) desde hace 37 dias de evolucion. El examen clínico destaca Paciente en regular estado general. El diagnóstico presuntivo es Dermatitis, no especificada. Se prescribe Prednisona 5mg, Prednisona 5mg, prescribiendo 4 días de reposo absoluto y control en 24 días.",
  "physicalExam": "Paciente en regular estado general",
  "chiefComplaint": "Nauseas y mareos matutinos constantes"
}
```

**Qué esperar:**
- Diagnóstico: Dermatitis no especificada → ICD-10 debería ser `L30.9`
- Prescripciones: comportamiento incierto — puede ser 1 entrada o 2 entradas de Prednisona 5mg
- Punto crítico: si devuelve 2 entradas idénticas, el frontend debería deduplicar antes de confirmar

**Output:**
```json
{
	"diagnoses": [
		{
			"icd10Code": "L30.9",
			"description": "Dermatitis, no especificada",
			"severity": "mild"
		}
	],
	"prescriptions": [
		{
			"medicationName": "Prednisona 5mg",
			"matchedMedicationId": "f0000000-0000-0000-0000-000000000019",
			"dosage": "5mg",
			"frequency": "Una vez al día",
			"durationDays": 4,
			"instructions": "Reposo absoluto durante 4 días. Control en 24 días"
		}
	],
	"procedures": []
}
```

**Evaluación:** ✅ ICD-10 `L30.9` correcto. Deduplicación inteligente: Prednisona aparecía dos veces en el texto pero el LLM retornó una sola entrada. El frontend no necesita lógica extra de deduplicación para este patrón.

---

## Resumen de resultados

Tiempo de respuesta promedio: **4s** · Máximo: **6s** · Modelo: `claude-haiku-4-5-20251001`

| Caso | Estado | ICD-10 | Prescripciones | UUID match | Tiempo | Notas |
|---|---|---|---|---|---|---|
| TC-01 | ✅ Completo | ✅ K26.9 exacto | ✅ 1/1 match | ✅ | ~4s | `durationDays` = días de seguimiento, no del medicamento |
| TC-02 | ✅ Completo | ✅ I21.9 exacto | ✅ 2/2 match | ✅ | ~5s | `frequency: "No especificada"` — LLM fue honesto |
| TC-03 | ✅ Completo | ✅ J06.9 exacto | ✅ vacío correcto | — | ~4s | Sin alucinaciones ante "medicamentos segun receta" |
| TC-04 | ✅ Completo | ⚠️ E11.9 (aceptable) | ✅ 2/2 match | ✅ | ~6s | Gel tópico resuelto; `instructions` incluyó "aplicación tópica" |
| TC-05 | ✅ Completo | ✅ K76.0 exacto | ✅ 2/2 match | ✅ | ~4s | Ignoró chief complaint irrelevante, extrajo de notas |
| TC-06 | ✅ Completo | ✅ L30.9 exacto | ✅ deduplicó | ✅ | ~4s | Colapsó duplicado a 1 entrada sin instrucción explícita |

### Hallazgos globales

**Fortalezas:**
- ICD-10 correcto en 5/6, aceptable en 1/6
- 10/10 UUIDs de medicamentos resueltos correctamente contra el catálogo
- No inventó medicamentos en TC-03 (caso crítico de alucinación)
- Ignora chief complaint cuando contradice las notas clínicas
- Deduplicación inteligente (TC-06)

**Error sistemático identificado:**
- `durationDays` toma los días de reposo o seguimiento en vez de la duración real del medicamento. Las notas de seed no tienen esta información separada. En notas clínicas reales (ej: "Amoxicilina 500mg por 7 días") este campo debería resolverse correctamente.

**Acción recomendada:** agregar deduplicación por `medicationName` en el frontend antes de mostrar el preview al médico.
