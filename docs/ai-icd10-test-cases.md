# Casos de Prueba — P1: Sugerencia de Códigos ICD-10

Endpoint: `POST /api/v1/ai/icd10/suggest`  
Body: `{ "query": "descripción clínica en lenguaje libre" }`  
Requiere `Authorization: Bearer <token>`.

> **Objetivo de las pruebas:** Validar que el pipeline query expansion (Claude) + vector search (pgvector) + reranking (Claude) resuelve el vocabulary mismatch entre lenguaje coloquial médico y terminología CIE-10 formal.

---

## Caso 1 — Hipertensión con cefalea 

**Request:**
```json
	{ "query": "hipertensión arterial con cefalea" }
```

**Resultado esperado:**  
`I10` (Hipertensión esencial) debe aparecer #1. `G44.x` (síndromes de cefalea) en los siguientes puestos. Es el caso que motivó toda la arquitectura de query expansion — si falla aquí, hay regresión.

**Output obtenido:**
```json
{
	"suggestions": [
		{
			"code": "I10",
			"description": "Hipertensión esencial (primaria)",
			"score": 0.8788156658411026
		},
		{
			"code": "I77",
			"description": "Otros trastornos arteriales o arteriolares",
			"score": 0.7953592985868454
		},
		{
			"code": "I73.9",
			"description": "Enfermedad vascular periférica, no especificada",
			"score": 0.747022271156311
		},
		{
			"code": "I73.8",
			"description": "Otras enfermedades vasculares periféricas especificadas",
			"score": 0.7431568801403046
		}
	]
}

2.18
```

**Evaluación:** ✅ I10 #1 con score 0.879 — el caso de referencia recuperado. El prompt v3 ("No omitas diagnósticos activos") devuelve HTA a la primera posición. Ruido en #2–4: I77 y I73.x son trastornos arteriales relacionados con HTA pero G44.x (cefalea) ya no aparece — el normalize priorizó HTA y descartó la cefalea como diagnóstico secundario. Solo 4 resultados. Para un médico buscando el código principal, I10 #1 es el resultado correcto.

---

## Caso 2 — Diabetes coloquial

**Request:**
```json
{ "query": "azúcar alta, el paciente es diabético" }
```

**Resultado esperado:**  
`E11.9` (Diabetes mellitus tipo 2 sin complicaciones) o `E11` debe aparecer en top-3. También pueden aparecer `E10` (DM tipo 1) y `E14` (diabetes no especificada). El challenge: "azúcar alta" no existe en el catálogo CIE-10 — la query expansion debe convertirlo a "diabetes mellitus".

**Output obtenido:**
```json
{
	"suggestions": [
		{
			"code": "E14.9",
			"description": "Diabetes mellitus, no especificada sin mencion de complicacion",
			"score": 0.8778073787689209
		},
		{
			"code": "E14",
			"description": "Diabetes mellitus, no especificada",
			"score": 0.8507718145847321
		},
		{
			"code": "E14.8",
			"description": "Diabetes mellitus, no especificada con complicaciones no especificadas",
			"score": 0.8945444971323013
		},
		{
			"code": "E13.8",
			"description": "Otras diabetes mellitus especificadas con complicaciones no especificadas",
			"score": 0.80193130671978
		},
		{
			"code": "E12.8",
			"description": "Diabetes mellitus asociada con desnutricion con complicaciones no especificadas",
			"score": 0.8008830845355988
		}
	]
}

3.05s
```

**Evaluación:** ⚠️ Leve regresión en especificidad. E14.9 (Diabetes mellitus no especificada) en #1 en lugar de E11.9 (tipo 2). El nuevo prompt hizo que la normalización produjera "diabetes mellitus" sin especificar el tipo — E14.x domina el pool. Clínicamente no es incorrecto (la query no menciona explícitamente tipo 2), pero E11.9 es más preciso para el perfil del caso. Los scores subieron (0.80–0.89) respecto a versiones anteriores.

---

## Caso 3 — Accidente cerebrovascular coloquial

**Request:**
```json
{ "query": "derrame cerebral con parálisis del lado izquierdo" }
```

**Resultado esperado:**  
`I64` (Accidente vascular encefálico, no especificado) o `I63.x` (infarto cerebral) en top-1 o top-2. `G81.0` (hemiplejia flácida) puede aparecer por la parálisis. El challenge: "derrame" es un término totalmente coloquial para ACV/ECV.

**Output obtenido:**
```json
{
	"suggestions": [
		{
			"code": "I63.9",
			"description": "Infarto cerebral, no especificado",
			"score": 0.764068603515625
		},
		{
			"code": "I64",
			"description": "Accidente vascular encefálico agudo, no especificado como hemorrágico o isquémico",
			"score": 0.7530555129051208
		},
		{
			"code": "I69.8",
			"description": "Secuelas de otras enfermedades cerebrovasculares y de las no especificadas",
			"score": 0.7909737974405289
		},
		{
			"code": "G46.8",
			"description": "Otros síndromes vasculares encefálicos en enfermedades cerebrovasculares (I60–I67)",
			"score": 0.7633167803287506
		}
	]
}

2.76s
```

**Evaluación:** ✅ I63.9 (infarto cerebral no especificado) #1 e I64 (accidente vascular encefálico agudo) #2 — exactamente los códigos esperados en top-2. I64 es precisamente el código del "resultado esperado". I69.8 (secuelas) bajó al #3. Solo 4 resultados — Claude descartó un candidato por irrelevante. Resultado sólido.

---

## Caso 4 — Infarto agudo de miocardio

**Request:**
```json
{ "query": "infarto al corazón, dolor en el pecho irradiado al brazo" }
```

**Resultado esperado:**  
`I21.x` (Infarto agudo del miocardio) en top-1. Posiblemente `I20.9` (angina) y `R07` (dolor de pecho) también presentes. "Infarto al corazón" es coloquial para IAM.

**Output obtenido:**
```json
{
	"suggestions": [
		{
			"code": "I21.0",
			"description": "Infarto transmural agudo del miocardio de la pared anterior",
			"score": 0.7928029298782349
		},
		{
			"code": "I21.9",
			"description": "Infarto agudo del miocardio, sin otra especificación",
			"score": 0.7350118458271027
		},
		{
			"code": "I21",
			"description": "Infarto agudo del miocardio",
			"score": 0.7475935518741608
		}
	]
}

3.07s
```

**Evaluación:** ✅ I21.0 (infarto transmural pared anterior) #1, I21.9 #2, I21 #3 — todos I21.x, ningún ruido. Solo 3 resultados; Claude fue conservador pero correcto. I21.0 en #1 es más específico que el I21.9 esperado — no es peor, es más preciso. I25.2 (infarto antiguo) de v2 desapareció.

---

## Caso 5 — Infección urinaria

**Request:**
```json
{ "query": "infección de orina con ardor al orinar" }
```

**Resultado esperado:**  
`N39.0` (Infección de vías urinarias, sitio no especificado) en top-1 o top-2. Posiblemente `N30.x` (cistitis). El challenge es moderado — "infección de orina" es bastante cercano a la terminología formal.

**Output obtenido:**
```json
{
	"suggestions": [
		{
			"code": "N39.0",
			"description": "Infección de vías urinarias, sitio no especificado",
			"score": 0.7847902476787567
		},
		{
			"code": "S37",
			"description": "Traumatismo del aparato urinario y de los órganos pélvicos",
			"score": 0.7849846333265305
		},
		{
			"code": "Q64.9",
			"description": "Malformación congénita del aparato urinario, no especificada",
			"score": 0.8138797879219055
		},
		{
			"code": "J98.9",
			"description": "Trastorno respiratorio, no especificado",
			"score": 0.802691251039505
		}
	]
}

2.46s
```

**Evaluación:** ✅ N39.0 #1 mantenido. Ruido en #2–4: S37 (traumatismo urinario) y Q64.9 (malformación congénita) son relacionados con vías urinarias pero no con infección; J98.9 (trastorno respiratorio) es completamente fuera de lugar — posiblemente el normalize añadió "infección" y eso arrastró un código de vías respiratorias. Solo 4 resultados. El código principal sigue correcto.

---

## Caso 6 — Salud mental con términos mixtos

**Request:**
```json
{ "query": "paciente con mucha ansiedad y tristeza profunda, no duerme" }
```

**Resultado esperado:**  
`F41.1` (Trastorno de ansiedad generalizada) y `F32.x` (episodio depresivo) deben aparecer. `G47.0` (insomnio) posiblemente también. El challenge: vocabulario emocional ("tristeza profunda") vs. terminología psiquiátrica formal.

**Output obtenido:**
```json
{
	"suggestions": [
		{
			"code": "F32.9",
			"description": "Episodio depresivo, no especificado",
			"score": 0.778509184718132
		},
		{
			"code": "F41.1",
			"description": "Trastorno de ansiedad generalizada",
			"score": 0.761776328086853
		},
		{
			"code": "F32.2",
			"description": "Episodio depresivo grave sin síntomas psicóticos",
			"score": 0.7334375381469727
		},
		{
			"code": "F32.1",
			"description": "Episodio depresivo moderado",
			"score": 0.7550928592681885
		},
		{
			"code": "F33.9",
			"description": "Trastorno depresivo recurrente, no especificado",
			"score": 0.7518631368875504
		}
	]
}

3.39s
```

**Evaluación:** ✅ MEJORA — F41.1 (Trastorno de ansiedad generalizada) aparece por primera vez en #2, después de estar ausente en v1 y v2. El prompt "Incluye TODAS las condiciones" forzó a la normalización a incluir tanto depresión como ansiedad. F32.9 #1, F32.2 #3, F32.1 #4, F33.9 #5 completan el cuadro depresivo. Se perdió G47.0 (insomnio) que aparecía antes, pero ganar F41.1 es más relevante para el diagnóstico mixto. 5 resultados completos por primera vez en este caso.

---

## Caso 7 — Fractura con mecanismo de trauma

**Request:**
```json
{ "query": "se cayó y se quebró la cadera, adulto mayor" }
```

**Resultado esperado:**  
`S72.0` (Fractura del cuello del fémur) o `S72.x` en top-1. Posiblemente `M80.x` (osteoporosis con fractura). El challenge: "se quebró la cadera" es jerga coloquial muy diferente a "fractura del cuello del fémur".

**Output obtenido:**
```json
{
	"suggestions": [
		{
			"code": "S72.0",
			"description": "Fractura del cuello de fémur",
			"score": 0.7601043283939362
		},
		{
			"code": "M80.9",
			"description": "Osteoporosis no especificada, con fractura patológica",
			"score": 0.7773410379886627
		},
		{
			"code": "T93.1",
			"description": "Secuelas de fractura del fémur",
			"score": 0.7833532840013504
		},
		{
			"code": "S12.9",
			"description": "Fractura del cuello, parte no especificada",
			"score": 0.7615000009536743
		},
		{
			"code": "T14.8",
			"description": "Otros traumatismos de región no especificada del cuerpo",
			"score": 0.7612228393554688
		}
	]
}

3.23s
```

**Evaluación:** ✅ S72.0 (Fractura del cuello de fémur) #1 — el código exactamente esperado, mejor resultado histórico de este caso. M80.9 (Osteoporosis con fractura patológica) #2 es muy relevante para "adulto mayor" — el sistema infirió fragilidad ósea del contexto. T93.1 (secuelas de fractura) #3 es discutible pero relacionado. S12.9 (fractura de cuello, probablemente cervical) #4 es ruido menor. T14.8 genérico #5. De ❌ total (V91 embarcación) a ✅ en dos iteraciones.

---

## Caso 8 — Término técnico abreviado

**Request:**
```json
{ "query": "EPOC exacerbado, paciente fumador crónico" }
```

**Resultado esperado:**  
`J44.1` (EPOC con exacerbación aguda) en top-1. Este caso es el inverso — el médico usa una abreviatura técnica correcta. Valida que el sistema también funciona con terminología precisa, no solo coloquial.

**Output obtenido:**
```json
{
	"suggestions": [
		{
			"code": "J44.1",
			"description": "Enfermedad pulmonar obstructiva crónica con exacerbación aguda, no especificada",
			"score": 0.8649487644433975
		},
		{
			"code": "J44.0",
			"description": "Enfermedad pulmonar obstructiva crónica con infección aguda de las vías respiratorias inferiores",
			"score": 0.8418308049440384
		},
		{
			"code": "J44.9",
			"description": "Enfermedad pulmonar obstructiva crónica, no especificada",
			"score": 0.8187071979045868
		},
		{
			"code": "J44.8",
			"description": "Otras enfermedades pulmonares obstructivas crónicas especificadas",
			"score": 0.8240056931972504
		},
		{
			"code": "J44",
			"description": "Otras enfermedades pulmonares obstructivas crónicas",
			"score": 0.8218724429607391
		}
	]
}

2.49s
```

**Evaluación:** ✅ Mantenido. J44.1 #1 con score 0.865. Todos J44.x. El caso más robusto del batch — no ha fallado ni fluctuado en ninguna versión del prompt.

---

## Caso 9 — Dolor lumbar

**Request:**
```json
{ "query": "dolor de espalda baja crónico, lumbago" }
```

**Resultado esperado:**  
`M54.5` (Lumbago no especificado) o `M54.4` (lumbago con ciática). Interesante porque "lumbago" sí está en CIE-10 — el vector search podría encontrarlo directamente sin necesitar mucha normalización.

**Output obtenido:**
```json
{
	"suggestions": [
		{
			"code": "M51.1",
			"description": "Trastornos de disco lumbar y otros, con radiculopatía (G55.1)",
			"score": 0.7045471668243408
		},
		{
			"code": "M51.0",
			"description": "Trastornos de discos intervertebrales lumbares y otros, con mielopatía (G99.2)",
			"score": 0.6696363985538483
		},
		{
			"code": "S33.5",
			"description": "Esguinces y torceduras de la columna lumbar",
			"score": 0.6937208771705627
		},
		{
			"code": "S33.0",
			"description": "Ruptura traumática de disco intervertebral lumbar",
			"score": 0.6673180758953094
		},
		{
			"code": "G54.1",
			"description": "Trastornos del plexo lumbosacro",
			"score": 0.6851213872432709
		}
	]
}

2.52s
```

**Evaluación:** ❌ M54.5 (Lumbago) sigue sin aparecer. M51.1 (disco lumbar con radiculopatía) en #1 es clínicamente relacionado con dolor lumbar pero no es lumbago. Los scores bajaron a 0.67–0.70 respecto a v2, lo que sugiere que la normalización produjo algo diferente en esta versión. Límite estructural de arquitectura: nomic-embed-text no recupera M54.5 semánticamente desde lenguaje coloquial en español. Acordado dejar pendiente.

---

## Caso 10 — Query ambigua / múltiples condiciones

**Request:**
```json
{ "query": "fiebre, tos seca y dificultad para respirar" }
```

**Resultado esperado:**  
`J18.x` (neumonía), `J06.9` (infección respiratoria aguda) o `J22` (infección aguda vías respiratorias inferiores) posibles. Este caso tiene tres síntomas sin diagnóstico explícito — valida si el sistema puede inferir la condición probable. No hay un código "correcto" único.

**Output obtenido:**
```json
{
	"suggestions": [
		{
			"code": "J06.9",
			"description": "Infección aguda de las vías respiratorias superiores, no especificada",
			"score": 0.8586880415678024
		},
		{
			"code": "J22",
			"description": "Infección aguda no especificada de las vías respiratorias inferiores",
			"score": 0.8381578177213669
		},
		{
			"code": "J96.9",
			"description": "Insuficiencia respiratoria, no especificada",
			"score": 0.8222459852695465
		}
	]
}

3.84s
```

**Evaluación:** ✅ Transformación total. En v2 este caso devolvía Sjögren / andrógenos / gota. Ahora: J06.9 (infección aguda vías respiratorias superiores) #1 y J22 (infección aguda vías respiratorias inferiores) #2 — ambos están en la lista de códigos esperados. J96.9 (insuficiencia respiratoria) #3 es razonable para "dificultad para respirar". Solo 3 resultados — Claude fue conservador. El prompt "Incluye TODAS las condiciones" corrigió la normalización: "tos seca" ya no se confunde con "síndrome seco". J18.x (neumonía) sería ideal pero no apareció; J06.9 y J22 son clínicamente equivalentes para síntomas sin diagnóstico confirmado.

---

## Tabla resumen v3 (prompt final)

| # | Query | Código esperado | Tiempo | Resultado v3 | vs v1 | Nota |
|---|---|---|---|---|---|---|
| 1 | Hipertensión + cefalea | I10 | 2.18s | ✅ #1 | = | I10 recuperado; G44.x ausente pero código principal correcto |
| 2 | Azúcar alta / diabético | E11.9 | 3.05s | ⚠️ E14.9 #1 | ✅→⚠️ | E14 (no especificada) en lugar de E11 (tipo 2); menos específico |
| 3 | Derrame cerebral | I64/I63 | 2.76s | ✅ I63.9+I64 | ⚠️→✅ | Ambos códigos esperados en top-2 |
| 4 | Infarto al corazón | I21.9 | 3.07s | ✅ I21.0 #1 | = | Solo 3 resultados; todos I21.x correctos |
| 5 | Infección de orina | N39.0 | 2.46s | ✅ #1 | ❌→✅ | Mantenido; ruido menor en #2-4 |
| 6 | Ansiedad + tristeza | F41.1/F32 | 3.39s | ✅ F32.9+F41.1 | ⚠️→✅ | F41.1 aparece por primera vez en #2 |
| 7 | Se quebró la cadera | S72.0 | 3.23s | ✅ S72.0 #1 | ❌→✅ | Mejor resultado histórico; M80.9 (osteoporosis) en #2 |
| 8 | EPOC exacerbado | J44.1 | 2.49s | ✅ #1 | = | Estable en todas las versiones |
| 9 | Dolor de espalda baja | M54.5 | 2.52s | ❌ | = | Límite de arquitectura — pendiente |
| 10 | Fiebre + tos + disnea | J18/J06.9 | 3.84s | ✅ J06.9 #1 | BUG→✅ | Transformación total: de Sjögren a J06.9/J22 |

### Conclusiones finales

**Tasa de éxito v3:** 8/10 claros · 1/10 parcial (C2) · 1/10 fallo estructural (C9)

**Evolución por versión:**

| Caso | v1 | v2 | v3 |
|---|---|---|---|
| C1 Hipertensión | ✅ | ❌ REGRESIÓN | ✅ |
| C2 Diabetes | ✅ | ✅ | ⚠️ |
| C3 ACV | ⚠️ | ✅ | ✅ |
| C4 IAM | ✅ | ✅ | ✅ |
| C5 ITU | ❌ | ✅ | ✅ |
| C6 Salud mental | ⚠️ | ⚠️ | ✅ |
| C7 Fractura cadera | ❌ | ⚠️ | ✅ |
| C8 EPOC | ✅ | ✅ | ✅ |
| C9 Lumbago | ❌ | ❌ | ❌ |
| C10 Síntomas resp. | BUG | ⚠️ | ✅ |

**Qué funcionó:** El pipeline final (topK=20 + prompt quirúrgico con "Incluye TODAS las condiciones" + "No omitas diagnósticos activos") resolvió simultáneamente tres familias de problemas: subcódigos que no entraban al pool (C5), mecanismos accidentales que distorsionaban la normalización (C7), y síntomas múltiples sin diagnóstico explícito (C10, C6).

**Límite persistente (C9):** nomic-embed-text no recupera M54.5 semánticamente desde lenguaje coloquial español. Requeriría sinónimos indexados o un modelo de embedding entrenado en español médico.
