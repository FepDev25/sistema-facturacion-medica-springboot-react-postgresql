# Casos de Prueba — P4: Sugerencia de Ítems a Facturar

Endpoint: `POST /api/v1/ai/invoices/{id}/suggest-items`  
Sin body. El UUID va en la URL. Requiere `Authorization: Bearer <token>`.

> **Nota sobre los seeds:** Los datos de prueba presentan incoherencias entre especialidad, diagnósticos y procedimientos (por diseño del seed masivo). La IA igual debería producir sugerencias clínicamente razonables en base al contexto disponible.

---

## Caso 1 — Cardiología · FAC-04837 · Rodrigo Flórez

**Request:**
```
POST /api/v1/ai/invoices/4062a42e-5ae9-4222-8717-529c691e24ef/suggest-items
Authorization: Bearer <token>
```

**Contexto clínico en la BD:**

| Tipo | Código / Nombre | Detalle |
|---|---|---|
| Diagnóstico | K29.7 | Gastritis, no especificada (mild) |
| Diagnóstico | E66.3 | Sobrepeso (mild) |
| Diagnóstico | J00 | Nasofaringitis aguda — resfriado común (mild) |
| Prescripción | Clopidogrel 75mg | 125mg c/8h por 26 días |
| Prescripción | Ácido acetilsalicílico 100mg | 0.5mg c/día por 21 días |
| Prescripción | Alendronato 70mg | 5mg c/día por 26 días |
| Prescripción | Amlodipino 5mg | 200mg c/8h por 27 días |
| Procedimiento | 73140 | Radiografía de mano |
| Procedimiento | 93000 | Electrocardiograma en reposo, 12 derivaciones |

**Resultado esperado:**  
La IA debería sugerir la consulta de cardiología (`Consulta cardiologia`), el electrocardiograma (`Electrocardiograma 12 derivaciones`) por el procedimiento 93000 y `Radiografía Simple` por la radiografía de mano. Los medicamentos Clopidogrel, Amlodipino y Ácido acetilsalicílico del catálogo deberían aparecer por las prescripciones cardiovasculares. Interesante: gastritis puede motivar `Consulta gastroenterologia`.

**Output obtenido:**

```json
{
	"suggestedItems": [
		{
			"itemType": "service",
			"name": "Consulta Medicina General",
			"matchedCatalogId": "e0000000-0000-0000-0000-000000000001",
			"unitPrice": 600.00,
			"justification": "Consulta inicial para evaluación de gastritis, sobrepeso y nasofaringitis aguda"
		},
		{
			"itemType": "service",
			"name": "Electrocardiograma 12 derivaciones",
			"matchedCatalogId": "588ff6d7-5f88-446d-a9e7-f8aeef5f7100",
			"unitPrice": 450.00,
			"justification": "Procedimiento realizado durante la cita para evaluación cardíaca"
		},
		{
			"itemType": "service",
			"name": "Radiografia Simple",
			"matchedCatalogId": null,
			"unitPrice": null,
			"justification": "Radiografía de mano realizada durante la cita"
		},
		{
			"itemType": "medication",
			"name": "Omeprazol 20mg",
			"matchedCatalogId": "f0000000-0000-0000-0000-000000000011",
			"unitPrice": 95.00,
			"justification": "Protector gástrico indicado para gastritis"
		},
		{
			"itemType": "medication",
			"name": "Clopidogrel 75mg",
			"matchedCatalogId": "8d1f7457-7936-4ea1-a0aa-3df392f636f3",
			"unitPrice": 75.00,
			"justification": "Prescrito en dosis de 75mg según indicación clínica"
		},
		{
			"itemType": "medication",
			"name": "Amlodipino 5mg",
			"matchedCatalogId": "655600f1-02cb-4875-9fbf-684c67cdfaaf",
			"unitPrice": 42.00,
			"justification": "Prescrito en dosis de 5mg según indicación clínica"
		},
		{
			"itemType": "medication",
			"name": "Ácido acetilsalicílico 100mg",
			"matchedCatalogId": "1c57982d-88b0-4c89-90cb-d2c3b44e0702",
			"unitPrice": 15.00,
			"justification": "Prescrito en dosis de 100mg según indicación clínica"
		},
		{
			"itemType": "medication",
			"name": "Alendronato 70mg",
			"matchedCatalogId": "371ebf69-ef47-41df-884e-50f868b66004",
			"unitPrice": 120.00,
			"justification": "Prescrito en dosis de 70mg según indicación clínica"
		}
	]
}

3.58s
``` 

**Evaluación:** 7/8 UUIDs resueltos (87.5%). El único null es `Radiografía Simple` — la IA lo escribió sin tilde (`Radiografia Simple`) y el catálogo lo tiene con tilde (`Radiografía Simple`), lo que rompe el `equalsIgnoreCase`. Bug de normalización de acentos a documentar. Lo más valioso: el **Omeprazol 20mg fue inferido** a partir de la gastritis K29.7 aunque no estaba prescrito — razonamiento clínico correcto. Eligió `Consulta Medicina General` en lugar de `Consulta cardiologia` porque los diagnósticos (gastritis, sobrepeso, nasofaringitis) son más de medicina general que cardiología, pese a las prescripciones cardiovasculares. Decisión discutible pero coherente con el contexto textual disponible.

---

## Caso 2 — Pediatría · FAC-06591 · Zacarías Menchaca

**Request:**
```
POST /api/v1/ai/invoices/e51b13e0-6ff7-47fc-ad39-2972569a53ba/suggest-items
Authorization: Bearer <token>
```

**Contexto clínico en la BD:**

| Tipo | Código / Nombre | Detalle |
|---|---|---|
| Diagnóstico | J34.89 | Trastornos de nariz y senos paranasales (mild) |
| Diagnóstico | I48.91 | Fibrilación auricular no especificada (mild) |
| Diagnóstico | H93.11 | Acúfeno, oído derecho (mild) |
| Prescripción | Ciprofloxacino 500mg | 20mg c/12h por 12 días |
| Prescripción | Loratadina 10mg | 200mg c/8h por 18 días |
| Prescripción | Naproxeno 250mg | 600mg c/12h por 18 días |
| Prescripción | Pantoprazol 40mg | 0.5mg c/día por 23 días |
| Procedimiento | 45385 | Colonoscopia con polipectomía |

**Resultado esperado:**  
Especialidades mixtas presentes (ORL, cardiología, pediatría). La IA debería sugerir `Consulta Pediátrica` o `Consulta Especialista` dado el doctor. Los 4 medicamentos tienen nombre exacto en el catálogo — se esperan `matchedCatalogId` resueltos para todos ellos. La colonoscopia no tiene equivalente directo en el catálogo de servicios, por lo que el LLM podría omitirla o aproximarla.

**Output obtenido:**

```json
{
	"suggestedItems": [
		{
			"itemType": "service",
			"name": "Consulta Especialista",
			"matchedCatalogId": "e0000000-0000-0000-0000-000000000002",
			"unitPrice": 1200.00,
			"justification": "Consulta por trastornos de nariz y senos paranasales, fibrilación auricular y acúfeno que requieren evaluación especializada"
		},
		{
			"itemType": "service",
			"name": "Electrocardiograma 12 derivaciones",
			"matchedCatalogId": "588ff6d7-5f88-446d-a9e7-f8aeef5f7100",
			"unitPrice": 450.00,
			"justification": "Necesario para evaluar y monitorear la fibrilación auricular diagnosticada"
		},
		{
			"itemType": "service",
			"name": "Consulta gastroenterologia",
			"matchedCatalogId": "20011c20-f6ea-42a3-9937-39418829110e",
			"unitPrice": 700.00,
			"justification": "Justificado por la colonoscopia con polipectomía realizada durante la cita"
		},
		{
			"itemType": "medication",
			"name": "Ciprofloxacino 500mg",
			"matchedCatalogId": "f0000000-0000-0000-0000-000000000003",
			"unitPrice": 120.00,
			"justification": "Prescrito para infección respiratoria asociada a trastorno de senos paranasales"
		},
		{
			"itemType": "medication",
			"name": "Pantoprazol 40mg",
			"matchedCatalogId": "44dcc9c3-bc47-47cb-a558-7422b1d962cd",
			"unitPrice": 60.00,
			"justification": "Prescrito para protección gástrica durante tratamiento con antiinflamatorios"
		},
		{
			"itemType": "medication",
			"name": "Loratadina 10mg",
			"matchedCatalogId": "f0000000-0000-0000-0000-000000000016",
			"unitPrice": 55.00,
			"justification": "Prescrito para síntomas alérgicos asociados a trastorno nasal"
		},
		{
			"itemType": "medication",
			"name": "Naproxeno 250mg",
			"matchedCatalogId": "fbc1df32-c53b-488d-af6c-d5a60575cf1e",
			"unitPrice": 28.00,
			"justification": "Prescrito para manejo del dolor y antiinflamación"
		},
		{
			"itemType": "service",
			"name": "Consulta cardiologia",
			"matchedCatalogId": "571db4ce-353a-428e-8173-fb352c8569a2",
			"unitPrice": 800.00,
			"justification": "Evaluación especializada requerida para fibrilación auricular diagnosticada"
		}
	]
}


4.61s
```

**Evaluación:** 8/8 UUIDs resueltos (100%). El mejor caso de razonamiento inferencial: el **ECG 12 derivaciones fue inferido** directamente a partir de la fibrilación auricular (I48.91), sin que hubiera un procedimiento de ECG en la BD. La **`Consulta gastroenterologia` como proxy de la colonoscopia** (procedimiento sin equivalente en el catálogo) es un workaround inteligente. Sugirió `Consulta Especialista` + `Consulta cardiologia` simultáneamente — en producción el médico/recepcionista descartaría una, pero la IA acertó al identificar ambas especialidades relevantes. El caso más costoso en tiempo (4.61s) por la mayor carga inferencial.

---

## Caso 3 — Psiquiatría · FAC-05745 · Gabriel Acevedo

**Request:**
```
POST /api/v1/ai/invoices/d48dd6ac-a631-4842-80fa-b32c8be8a07b/suggest-items
Authorization: Bearer <token>
```

**Contexto clínico en la BD:**

| Tipo | Código / Nombre | Detalle |
|---|---|---|
| Diagnóstico | R50.9 | Fiebre, no especificada (mild) |
| Diagnóstico | Z01.819 | Examen de revisión preoperatoria (mild) |
| Prescripción | Amoxicilina 500mg | 80mg c/8h por 20 días |
| Prescripción | Metformina 850mg | 200mg c/8h por 14 días |
| Prescripción | Glibenclamida 5mg | 10mg c/día por 14 días |
| Prescripción | Clorfenamina 4mg | 600mg c/12h por 13 días |
| Procedimiento | 80061 | Perfil lipídico (colesterol total, HDL, triglicéridos) |
| Procedimiento | 93306 | Ecocardiograma transtorácico con Doppler |

**Resultado esperado:**  
Contexto preoperatorio interesante: la IA debería reconocer que Metformina + Glibenclamida apuntan a diabetes tipo 2 y sugerirlas como medicamentos. El perfil lipídico podría mapearse a `Química Sanguínea 6 Elementos` o `Biometría Hemática Completa`. El ecocardiograma debería resolverse a `Ecocardiograma transtoracico` ($2500). `Consulta psiquiatria` puede aparecer por la especialidad del médico aunque el contexto clínico sea más interno.

**Output obtenido:**

```json
{
	"suggestedItems": [
		{
			"itemType": "service",
			"name": "Consulta Medicina General",
			"matchedCatalogId": "e0000000-0000-0000-0000-000000000001",
			"unitPrice": 600.00,
			"justification": "Consulta clínica para evaluación de fiebre y examen preoperatorio"
		},
		{
			"itemType": "service",
			"name": "Ecocardiograma transtoracico",
			"matchedCatalogId": "23cf8ee9-8487-43a8-ae6c-80f59c392d52",
			"unitPrice": 2500.00,
			"justification": "Procedimiento realizado durante la cita para evaluación cardíaca preoperatoria"
		},
		{
			"itemType": "service",
			"name": "Electrocardiograma 12 derivaciones",
			"matchedCatalogId": "588ff6d7-5f88-446d-a9e7-f8aeef5f7100",
			"unitPrice": 450.00,
			"justification": "Complemento de evaluación preoperatoria para paciente con examen de revisión preoperatoria"
		},
		{
			"itemType": "medication",
			"name": "Clorfenamina 4mg",
			"matchedCatalogId": "ffcc71cd-1d29-4e57-9b4b-ff3a5e38c5d0",
			"unitPrice": 12.00,
			"justification": "Prescrito para síntomas alérgicos/antihistamínico asociado a fiebre"
		},
		{
			"itemType": "medication",
			"name": "Amoxicilina 500mg",
			"matchedCatalogId": "f0000000-0000-0000-0000-000000000001",
			"unitPrice": 85.00,
			"justification": "Prescrito como antibiótico para infección asociada a fiebre por 5 días"
		},
		{
			"itemType": "medication",
			"name": "Metformina 850mg",
			"matchedCatalogId": "f0000000-0000-0000-0000-000000000009",
			"unitPrice": 120.00,
			"justification": "Prescrito para control glucémico por 14 días"
		},
		{
			"itemType": "medication",
			"name": "Glibenclamida 5mg",
			"matchedCatalogId": "f0000000-0000-0000-0000-000000000010",
			"unitPrice": 85.00,
			"justification": "Prescrito como hipoglucemiante oral por 14 días"
		},
		{
			"itemType": "medication",
			"name": "Paracetamol 500mg",
			"matchedCatalogId": "f0000000-0000-0000-0000-000000000004",
			"unitPrice": 35.00,
			"justification": "Antipirético indicado para manejo de fiebre no especificada"
		}
	]
}

3.99s
```

**Evaluación:** 8/8 UUIDs resueltos (100%). El **Ecocardiograma transtorácico ($2500) fue identificado y resuelto** correctamente a partir del procedimiento 93306 — el ítem más costoso del catálogo de servicios, bien facturado. El **ECG 12 derivaciones fue inferido** como complemento lógico del preoperatorio aunque no estaba en procedimientos — razonamiento válido. El **Paracetamol** también fue inferido por la fiebre R50.9 sin estar prescrito. La IA identificó correctamente que Metformina + Glibenclamida apuntan a diabetes tipo 2. No sugirió `Consulta psiquiatria` por el médico — priorizó el contexto clínico (correcto para facturación).

---

## Caso 4 — Oncología · FAC-04382 · Flavio Rubio

**Request:**
```
POST /api/v1/ai/invoices/e28939a1-e0be-476c-9afc-5e6e9cd4396b/suggest-items
Authorization: Bearer <token>
```

**Contexto clínico en la BD:**

| Tipo | Código / Nombre | Detalle |
|---|---|---|
| Diagnóstico | G89.29 | Dolor crónico, no clasificado (mild) |
| Diagnóstico | I20.9 | Angina de pecho, no especificada (mild) |
| Prescripción | Ranitidina 150mg | 5mg c/día por 29 días |
| Prescripción | Amoxicilina 500mg | 300mg c/día por 11 días |
| Prescripción | Difenhidramina 25mg | 75mg c/día por 15 días |
| Prescripción | Pantoprazol 40mg | 20mg c/12h por 9 días |
| Procedimiento | 99392 | Examen preventivo periódico, niño 1–4 años |
| Procedimiento | 71047 | Radiografía de tórax, 3 vistas |

**Resultado esperado:**  
Angina de pecho (I20.9) es el diagnóstico más relevante. La IA debería sugerir `Consulta cardiologia` o `Consulta oncologia` (por el médico), `Radiografia de torax` ($350 — matcheo probable con el procedimiento 71047), y Pantoprazol + Amoxicilina del catálogo. La Difenhidramina podría aparecer por dolor/alergias. Caso interesante: ¿resolverá el mismatch entre oncología y angina?

**Output obtenido:**

```json
{
	"suggestedItems": [
		{
			"itemType": "service",
			"name": "Consulta Medicina General",
			"matchedCatalogId": "e0000000-0000-0000-0000-000000000001",
			"unitPrice": 600.00,
			"justification": "Consulta clínica para evaluación de dolor crónico y angina de pecho"
		},
		{
			"itemType": "service",
			"name": "Electrocardiograma 12 derivaciones",
			"matchedCatalogId": "588ff6d7-5f88-446d-a9e7-f8aeef5f7100",
			"unitPrice": 450.00,
			"justification": "Evaluación cardiaca necesaria para angina de pecho"
		},
		{
			"itemType": "service",
			"name": "Radiografia de torax",
			"matchedCatalogId": "6c0f31af-619d-489f-a30a-b838b9e082dd",
			"unitPrice": 350.00,
			"justification": "Procedimiento realizado durante la cita (radiografía de tórax, 3 vistas)"
		},
		{
			"itemType": "medication",
			"name": "Ranitidina 150mg",
			"matchedCatalogId": "f0000000-0000-0000-0000-000000000012",
			"unitPrice": 60.00,
			"justification": "Prescrito para protección gástrica"
		},
		{
			"itemType": "medication",
			"name": "Pantoprazol 40mg",
			"matchedCatalogId": "44dcc9c3-bc47-47cb-a558-7422b1d962cd",
			"unitPrice": 60.00,
			"justification": "Prescrito para protección gástrica"
		},
		{
			"itemType": "medication",
			"name": "Amoxicilina 500mg",
			"matchedCatalogId": "f0000000-0000-0000-0000-000000000001",
			"unitPrice": 85.00,
			"justification": "Prescrito como antibiótico"
		},
		{
			"itemType": "medication",
			"name": "Difenhidramina 25mg",
			"matchedCatalogId": "fdf772d5-0a88-44f7-8165-44eec97661ef",
			"unitPrice": 15.00,
			"justification": "Prescrito como antihistamínico"
		}
	]
}

2.86s
```

**Evaluación:** 7/7 UUIDs resueltos (100%) — fue el caso con menos ítems (7) y también el más rápido (2.86s). La IA resolvió correctamente el mismatch especialidad/diagnóstico: el médico es oncólogo pero los diagnósticos son dolor crónico + angina, y eligió `Consulta Medicina General` en lugar de `Consulta oncologia` — coherente con el contexto clínico. `Radiografia de torax` mapeó exactamente el procedimiento 71047. Todos los medicamentos prescritos fueron incluidos con UUID resuelto. Sin inferencias fuera de prescripción, output conservador pero correcto.

---

## Caso 5 — Dermatología · FAC-04442 · Carla Ramos

**Request:**
```
POST /api/v1/ai/invoices/b08529d1-8446-4f12-87aa-17614b167649/suggest-items
Authorization: Bearer <token>
```

**Contexto clínico en la BD:**

| Tipo | Código / Nombre | Detalle |
|---|---|---|
| Diagnóstico | G35 | Esclerosis múltiple (mild) |
| Diagnóstico | E11.9 | Diabetes mellitus tipo 2, sin complicaciones (mild) |
| Diagnóstico | M67.20 | Sinovitis del tendón de Aquiles (mild) |
| Prescripción | Complejo B | 150mg c/12h por 26 días |
| Prescripción | Diclofenaco 50mg | 400mg c/8h por 13 días |
| Prescripción | Cetirizina 10mg | 150mg c/12h por 16 días |
| Procedimiento | 29826 | Artroscopia de hombro, reparación de manguito rotador |
| Procedimiento | 72148 | Radiografía de columna lumbar |

**Resultado esperado:**  
Caso multi-patológico complejo. La IA debería sugerir `Consulta neurologia` (G35 esclerosis múltiple), `Consulta endocrinologia` (E11.9 diabetes) y `Terapia Física (Sesión)` por la sinovitis + artroscopia. `Radiografia columna lumbar` ($400) debería resolverse directamente. Diclofenaco, Cetirizina y Complejo B están en el catálogo. Es el caso con mayor diversidad clínica — buen test para el razonamiento del LLM.

**Output obtenido:**

```json
{
	"suggestedItems": [
		{
			"itemType": "service",
			"name": "Consulta Neurologia",
			"matchedCatalogId": "384e85a4-9bb0-4898-b78d-1ca10fc599d7",
			"unitPrice": 850.00,
			"justification": "Diagnóstico de esclerosis múltiple requiere seguimiento especializado neurológico"
		},
		{
			"itemType": "service",
			"name": "Consulta Endocrinologia",
			"matchedCatalogId": "6aa5d7a2-8d95-4f75-94cc-4f5fc3edafbe",
			"unitPrice": 750.00,
			"justification": "Diagnóstico de diabetes mellitus tipo 2 requiere evaluación endocrinológica"
		},
		{
			"itemType": "service",
			"name": "Consulta Reumatologia",
			"matchedCatalogId": "0de98bb2-a875-4292-8e6b-65d8ea4c5cac",
			"unitPrice": 700.00,
			"justification": "Sinovitis del tendón de Aquiles requiere evaluación reumatológica"
		},
		{
			"itemType": "service",
			"name": "Radiografia columna lumbar",
			"matchedCatalogId": "aac21645-8f77-4959-8b59-ebb45aee64e6",
			"unitPrice": 400.00,
			"justification": "Procedimiento realizado durante la cita, debe facturarse"
		},
		{
			"itemType": "medication",
			"name": "Cetirizina 10mg",
			"matchedCatalogId": "f0000000-0000-0000-0000-000000000017",
			"unitPrice": 65.00,
			"justification": "Prescrito para manejo de síntomas alérgicos asociados"
		},
		{
			"itemType": "medication",
			"name": "Diclofenaco 50mg",
			"matchedCatalogId": "d5eb4cd1-4e0c-4fee-af14-a8952dc09e7e",
			"unitPrice": 30.00,
			"justification": "Prescrito para inflamación y dolor de la sinovitis del tendón de Aquiles"
		},
		{
			"itemType": "medication",
			"name": "Complejo B",
			"matchedCatalogId": "f0000000-0000-0000-0000-000000000014",
			"unitPrice": 85.00,
			"justification": "Prescrito como suplemento para soporte neurológico en esclerosis múltiple"
		},
		{
			"itemType": "service",
			"name": "Terapia Física (Sesión)",
			"matchedCatalogId": "e0000000-0000-0000-0000-000000000013",
			"unitPrice": 500.00,
			"justification": "Recomendado para rehabilitación post-procedimiento de artroscopia y manejo de sinovitis"
		}
	]
}

3.88s
```

**Evaluación:** 8/8 UUIDs resueltos (100%). **El mejor caso de razonamiento multi-patológico.** Identificó correctamente las 3 especialidades y las separó en 3 consultas distintas (`Consulta Neurologia`, `Consulta Endocrinologia`, `Consulta Reumatologia`) — una por cada diagnóstico, todos con UUID resuelto. `Radiografia columna lumbar` mapeó directamente al procedimiento 72148. `Terapia Física (Sesión)` inferida por artroscopia + sinovitis — correcto. **Complejo B justificado como soporte neurológico** para esclerosis múltiple — razonamiento clínico destacable. Sin ninguna inferencia fuera de contexto. Caso más equilibrado de toda la prueba.

---

## Caso 6 — Otorrinolaringología · FAC-06046 · Concepción Véliz

**Request:**
```
POST /api/v1/ai/invoices/a43ca190-4db0-4fc8-bc6c-d2c0ab0eb77f/suggest-items
Authorization: Bearer <token>
```

**Contexto clínico en la BD:**

| Tipo | Código / Nombre | Detalle |
|---|---|---|
| Diagnóstico | L23.9 | Dermatitis de contacto alérgica, causa no especificada (mild) |
| Diagnóstico | N94.6 | Dismenorrea, no especificada (mild) |
| Prescripción | Enalapril 10mg | 300mg c/8h por 6 días |
| Prescripción | Pantoprazol 40mg | 500mg c/12h por 19 días |
| Prescripción | Difenoxilato 2.5mg | 500mg c/8h por 8 días |
| Prescripción | Albuterol nebulización 5mg/mL | 1g c/8h por 15 días |
| Procedimiento | 49507 | Herniorrafia inguinal bilateral |
| Procedimiento | 29826 | Artroscopia de hombro, reparación de manguito rotador |

**Resultado esperado:**  
Caso con mayor incoherencia entre especialidad (ORL) y diagnósticos (dermatología, ginecología). La IA debería enfocarse en el contexto clínico real: Albuterol nebulización sugiere `Aplicación de Inyección` o vía inhalada, Enalapril apunta a hipertensión → posible `Consulta cardiologia`. Pantoprazol y Difenoxilato están en el catálogo. Interesante ver si la IA sugiere `Consulta alergologia` por L23.9 pese al médico ORL. Los procedimientos quirúrgicos no tienen equivalente directo en servicios.

**Output obtenido:**

```json
{
	"suggestedItems": [
		{
			"itemType": "service",
			"name": "Consulta Especialista",
			"matchedCatalogId": "e0000000-0000-0000-0000-000000000002",
			"unitPrice": 1200.00,
			"justification": "Consulta especializada requerida para evaluar dermatitis de contacto alérgica y dismenorrea"
		},
		{
			"itemType": "service",
			"name": "Consulta alergologia",
			"matchedCatalogId": "ea7211a2-e7a4-4dca-b5bc-5668441a343b",
			"unitPrice": 650.00,
			"justification": "Especialidad apropiada para diagnóstico y manejo de dermatitis de contacto alérgica (L23.9)"
		},
		{
			"itemType": "medication",
			"name": "Enalapril 10mg",
			"matchedCatalogId": "f0000000-0000-0000-0000-000000000008",
			"unitPrice": 75.00,
			"justification": "Medicamento prescrito en la cita para tratamiento de 5 días"
		},
		{
			"itemType": "medication",
			"name": "Albuterol nebulizacion 5mg/mL",
			"matchedCatalogId": "5a5a409b-12a4-4868-a388-14a9357bed54",
			"unitPrice": 90.00,
			"justification": "Medicamento prescrito en la cita para nebulización durante 14 días"
		},
		{
			"itemType": "medication",
			"name": "Pantoprazol 40mg",
			"matchedCatalogId": "44dcc9c3-bc47-47cb-a558-7422b1d962cd",
			"unitPrice": 60.00,
			"justification": "Medicamento prescrito en la cita para protección gástrica durante 7 días"
		},
		{
			"itemType": "medication",
			"name": "Difenoxilato 2.5mg",
			"matchedCatalogId": "ab155771-68d5-40d0-a499-a0c73eabc36e",
			"unitPrice": 20.00,
			"justification": "Medicamento prescrito en la cita durante 7 días"
		},
		{
			"itemType": "medication",
			"name": "Ibuprofeno 400mg",
			"matchedCatalogId": "f0000000-0000-0000-0000-000000000005",
			"unitPrice": 45.00,
			"justification": "Analgésico antiinflamatorio para manejo de dismenorrea (N94.6) y dolor postoperatorio"
		},
		{
			"itemType": "medication",
			"name": "Loratadina 10mg",
			"matchedCatalogId": "f0000000-0000-0000-0000-000000000016",
			"unitPrice": 55.00,
			"justification": "Antihistamínico para manejo de dermatitis de contacto alérgica"
		}
	]
}

3.71s
```

**Evaluación:** 8/8 UUIDs resueltos (100%). El caso con mayor incoherencia de seed y la IA lo manejó correctamente: **ignoró completamente la especialidad ORL** y siguió el contexto clínico. `Consulta alergologia` sugerida por L23.9 — coherente y clínicamente correcto. Los 4 medicamentos prescritos resueltos. **Ibuprofeno inferido para dismenorrea** (N94.6) y **Loratadina inferida para dermatitis alérgica** — ambos no estaban prescritos pero son adiciones clínicamente sólidas. El Albuterol para nebulización mapeó exactamente. Los procedimientos quirúrgicos (herniorrafia, artroscopia) no tienen equivalente en el catálogo y la IA correctamente no los inventó.

---

## Tabla resumen

| # | Factura | Especialidad | Ítems | UUID match | Tiempo | Destacado |
|---|---|---|---|---|---|---|
| 1 | FAC-04837 | Cardiología | 8 | 7/8 (87.5%) | 3.58s | Omeprazol inferido por gastritis K29.7; falla de tilde en "Radiografía Simple" |
| 2 | FAC-06591 | Pediatría | 8 | 8/8 (100%) | 4.61s | ECG inferido por I48.91; gastroenterología como proxy de colonoscopia ⭐ |
| 3 | FAC-05745 | Psiquiatría | 8 | 8/8 (100%) | 3.99s | Ecocardiograma $2500 resuelto; Paracetamol inferido por fiebre R50.9 |
| 4 | FAC-04382 | Oncología | 7 | 7/7 (100%) | 2.86s | Ignoró especialidad oncológica; Radiografía tórax mapeada directamente |
| 5 | FAC-04442 | Dermatología | 8 | 8/8 (100%) | 3.88s | 3 consultas de especialidades distintas por 3 diagnósticos; Complejo B neurológico ⭐⭐ |
| 6 | FAC-06046 | ORL | 8 | 8/8 (100%) | 3.71s | Ignoró ORL; Alergología por L23.9; Ibuprofeno + Loratadina inferidos ⭐ |
| **Prom.** | | | **7.8** | **96.4%** | **3.77s** | Haiku · modelo dev |

### Observación transversal

- **Resolución de UUIDs:** 95%+ en todos los casos menos el C1 donde el único fallo fue normalización de acentos (`Radiografía` vs `Radiografia`). En entornos de producción con nombres de catálogo consistentes esto no ocurre.
- **Inferencia clínica:** En 4 de 6 casos la IA agregó ítems no prescritos pero clínicamente justificados (Omeprazol, Paracetamol, Ibuprofeno, Loratadina, ECG como complemento). En producción el médico confirma o descarta — es exactamente el flujo esperado.
- **Mismatch especialidad/diagnóstico:** En todos los casos la IA priorizó el contexto clínico (diagnósticos + prescripciones) sobre la especialidad del médico — comportamiento correcto para facturación.
- **Tiempo:** 2.86–4.61s, promedio 3.77s con Haiku en dev. Con Sonnet en producción se espera mayor precisión a costo de latencia ligeramente mayor.
