# Diagramas — Sistema de Facturación Médica

Diagramas de flujo, máquinas de estado y arquitectura detallada del sistema.

---

## Dominios de Negocio

El sistema modela el ciclo operativo completo de una clínica: desde el registro del paciente hasta el cobro final, pasando por la consulta médica.

```mermaid
graph LR
    PAC[Paciente<br/>+ Póliza de Seguro]
    DOC[Médico<br/>+ Disponibilidad]
    CIT[Cita]
    EXP[Historia Clínica<br/>Diagnósticos · Prescripciones<br/>Procedimientos]
    FAC[Factura<br/>Servicios · Medicamentos]
    PAG[Pagos]
    SEG[Seguro<br/>Cobertura %]

    PAC --> CIT
    DOC --> CIT
    CIT -->|completar| EXP
    CIT -->|auto-genera| FAC
    EXP -->|prescripciones| FAC
    SEG -->|cobertura| FAC
    FAC --> PAG
```

---

## Máquina de estados — Citas

```mermaid
stateDiagram-v2
    [*] --> SCHEDULED : crear
    SCHEDULED --> CONFIRMED : confirmar
    SCHEDULED --> CANCELLED : cancelar
    SCHEDULED --> NO_SHOW : no-show
    CONFIRMED --> IN_PROGRESS : iniciar
    CONFIRMED --> CANCELLED : cancelar
    CONFIRMED --> NO_SHOW : no-show
    IN_PROGRESS --> COMPLETED : completar (DOCTOR)
    COMPLETED --> [*]
    CANCELLED --> [*]
    NO_SHOW --> [*]
```

`complete` es la operación crítica: en una sola transacción crea la historia clínica, genera la factura en borrador con número secuencial y actualiza el estado de la cita.

---

## Máquina de estados — Facturas

```mermaid
stateDiagram-v2
    [*] --> DRAFT : auto al completar cita
    DRAFT --> PENDING : confirmar (requiere ≥ 1 ítem)
    DRAFT --> CANCELLED : cancelar
    PENDING --> PAID : pagos cubren total
    PENDING --> PARTIAL_PAID : pago parcial
    PENDING --> OVERDUE : vencer
    PENDING --> CANCELLED : cancelar (sin pagos)
    PARTIAL_PAID --> PAID : pago restante
    PARTIAL_PAID --> OVERDUE : vencer
    PAID --> [*]
    OVERDUE --> [*]
    CANCELLED --> [*]
```

---

## Arquitectura de IA

```mermaid
graph TB
    subgraph "Endpoints AI — /api/v1/ai"
        P1["P1 — ICD-10<br/>POST /icd10/suggest"]
        P2["P2 — Extracción clínica<br/>POST /records/extract"]
        P3["P3 — Historial paciente<br/>POST /patients/{id}/query"]
        P4["P4 — Ítems factura<br/>POST /invoices/{id}/suggest-items"]
    end

    subgraph "Patrones"
        RAG["RAG Pipeline<br/>Query Expansion → Vector Search → Reranking"]
        TC["Tool Calling<br/>Lookup catálogo en tiempo real"]
        SO["Structured Output<br/>entity() → DTO tipado"]
        DUAL["Dual Retrieval<br/>Vector search + Contexto estructurado BD"]
    end

    subgraph "Infraestructura AI"
        EMB["Google AI Studio<br/>gemini-embedding-001 768d"]
        VEC["pgvector — HNSW<br/>14 268 códigos ICD-10<br/>+ expedientes de pacientes"]
        LLM["Claude claude-sonnet-4-6"]
    end

    P1 --> RAG
    P2 --> TC & SO
    P3 --> DUAL
    P4 --> TC & SO

    RAG --> EMB & VEC & LLM
    TC --> LLM
    SO --> LLM
    DUAL --> EMB & VEC & LLM
```

---

## P1 — RAG: Sugerencia de códigos ICD-10

Pipeline RAG de tres pasos para resolver el *vocabulary mismatch* entre el lenguaje coloquial médico y la terminología CIE-10 formal.

```mermaid
sequenceDiagram
    participant M as Médico
    participant BE as Backend
    participant C as Claude
    participant V as pgvector

    M->>BE: "dolor en el pecho al respirar"
    BE->>C: Query expansion — normalizar a terminología CIE-10
    C-->>BE: "pleuritis · dolor pleurítico · pleurodinia"
    BE->>V: Vector search — topK=20
    V-->>BE: 20 candidatos ICD-10
    BE->>C: Reranking — seleccionar top 5 más apropiados
    C-->>BE: [R09.1, J90, R07.3, J94.8, R09.89]
    BE-->>M: 5 códigos con descripción
```

---

## P2 — Tool Calling + Structured Output: Extracción de notas clínicas

Analiza las notas libres de una consulta y extrae estructuradamente diagnósticos, prescripciones y procedimientos.

```mermaid
sequenceDiagram
    participant M as Médico
    participant BE as Backend
    participant C as Claude

    M->>BE: Notas clínicas (texto libre)
    BE->>C: Structured Output — extraer diagnósticos, prescripciones, procedimientos
    C->>BE: Tool Call → lookupMedication("amoxicilina 500mg")
    BE-->>C: { matchedMedicationId: "uuid", name: "Amoxicilina 500mg" }
    C-->>BE: ExtractionResult { diagnoses[], prescriptions[], procedures[] }
    BE-->>M: Sheet con ítems para confirmar (checkboxes)
```

---

## P3 — RAG Dual: Consulta en lenguaje natural sobre historial del paciente

Arquitectura dual de recuperación que garantiza cobertura total independientemente del tamaño del historial.

```mermaid
graph LR
    Q["Pregunta del médico"] --> CLS["Clasificación de intención<br/>44 patrones · Unicode NFD"]
    CLS -->|"query específica<br/>(condición, medicamento, fecha)"| VA["Ruta A — Vector Search<br/>topK dinámico: ≤8 → 6, 9-15 → 10, >15 → 15"]
    CLS -->|"resumen o listado<br/>completo"| VB["Ruta B — Contexto estructurado BD<br/>bypass vector store, cobertura total"]
    VA & VB --> C["Claude claude-sonnet-4-6<br/>responde basado en expediente"]
    C --> R["Respuesta + fuentes<br/>(chips → navegan al expediente)"]
```

---

## P4 — Tool Calling + Structured Output: Sugerencia de ítems de factura

Claude consulta el catálogo activo via Tool Calling y propone ítems de facturación justificados clínicamente.

```mermaid
sequenceDiagram
    participant R as Recepcionista
    participant BE as Backend
    participant C as Claude

    R->>BE: "Sugerir ítems" (factura en DRAFT)
    BE->>C: Expediente médico de la cita
    C->>BE: Tool Call → getCatalogServices()
    BE-->>C: Catálogo de servicios activos
    C->>BE: Tool Call → getCatalogMedications()
    BE-->>C: Catálogo de medicamentos activos
    C-->>BE: SuggestionResult[] { matchedCatalogId, unitPrice, justificación }
    BE-->>R: Sheet con sugerencias — agregar individualmente
```

---

## Flujo JWT — Autenticación y Renovación

```mermaid
sequenceDiagram
    participant C as Cliente (SPA)
    participant F as JwtFilter
    participant A as AuthController
    participant R as Redis

    C->>A: POST /auth/login
    A-->>C: accessToken (15 min) + refreshToken (7 días)

    Note over C,F: Requests autenticadas
    C->>F: Authorization: Bearer accessToken
    F->>F: Validar firma + expiración + blacklist Redis

    Note over C,A: Renovación silenciosa
    C->>A: POST /auth/refresh (refreshToken)
    A->>R: Verificar JTI no revocado
    A-->>C: nuevo accessToken

    Note over C,A: Logout
    C->>A: POST /auth/logout
    A->>R: JTI en blacklist con TTL restante
```

---

## Pirámide de Testing — Backend

```mermaid
graph TB
    subgraph "E2E — Testcontainers + SpringBootTest"
        E2E["5 flujos de negocio completos<br/>PostgreSQL real en Docker"]
    end
    subgraph "Slice — MockMvc / DataJPA"
        WEB["12 WebMvc — controllers, security, validación"]
        JPA["9 DataJPA — repositorios, constraints, queries nativas"]
    end
    subgraph "Unit — JUnit 5 + Mockito"
        SVC["30 Service — lógica de negocio, máquinas de estado"]
        MAP["16 Mapper/DTO — MapStruct, records"]
        SEC["5 Security — JWT, filtros"]
        AUD["1 Audit — AOP aspect"]
    end
```
