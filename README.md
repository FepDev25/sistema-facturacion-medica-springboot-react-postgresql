# Sistema de Facturación Médica (SFM)

Sistema clínico fullstack con cuatro asistentes AI integrados: desde RAG con embeddings de Google Gemini hasta Tool Calling y Structured Output con Claude. El backend es una API RESTful en Spring Boot 4 con máquinas de estados explícitas, auditoría dual y 370 tests. El frontend es un backoffice React 19 con routing type-safe, estado del servidor con TanStack Query y una suite de 740 tests.

**Demo en producción:** https://sistema-facturacion-medica-springbo.vercel.app

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `doctor1` | `doctor123` | DOCTOR |
| `recep1` | `recep123` | RECEPTIONIST |

---

## Arquitectura General

```mermaid
graph TB
    subgraph FE["Frontend — React 19 / TypeScript"]
        UI["Backoffice SPA<br/>TanStack Router + Query<br/>Shadcn/ui + Tailwind 4"]
    end

    subgraph BE["Backend — Spring Boot 4 / Java 21"]
        API["REST API — /api/v1"]
        SEC["Spring Security — JWT Filter"]
        SVC["Servicios de Dominio<br/>Maquinas de Estado"]
        AUDIT["AuditAspect — AOP Order 1"]
        AI["Spring AI 2.0<br/>Claude + RAG + Tool Calling"]
    end

    subgraph INFRA["Infraestructura"]
        PG[("PostgreSQL 15<br/>pgvector — HNSW")]
        RD[("Redis 7<br/>JWT blacklist + Cache")]
        GG[("Google AI Studio<br/>gemini-embedding-001 768d")]
    end

    subgraph LLM["LLM (Anthropic)"]
        CL["Claude claude-sonnet-4-6"]
    end

    UI -->|"HTTP + Bearer JWT"| SEC
    SEC --> API
    API --> SVC
    API --> AI
    SVC --> PG
    AUDIT -.->|audit_log JSONB| PG
    SEC <-->|token blacklist| RD
    SVC <-->|catálogo TTL 2h| RD
    AI -->|embeddings| GG
    AI -->|vector search| PG
    AI <-->|LLM calls| CL
```

---

## Demo del Sistema

### Autenticación y Dashboard

| Login | Dashboard |
|---|---|
| ![Login](docs/img/01.png) | ![Dashboard](docs/img/02.png) |

---

### Gestión de Pacientes

| Lista de pacientes | Detalle con alerta de alergias |
|---|---|
| ![Pacientes](docs/img/03.png) | ![Alerta alergias](docs/img/04.png) |

El sistema detecta automáticamente pacientes con alergias registradas y muestra un banner de advertencia en cada punto de contacto clínico para evitar prescripciones peligrosas.

---

### Citas Médicas

| Lista de citas | Nueva cita |
|---|---|
| ![Citas](docs/img/06.png) | ![Nueva cita](docs/img/07.png) |

| Detalle de cita | Completar cita — datos clínicos |
|---|---|
| ![Detalle cita](docs/img/08.png) | ![Completar cita](docs/img/09.png) |

Al completar una cita, el médico registra signos vitales y notas clínicas. En una sola transacción el sistema crea el expediente médico y genera la factura en borrador automáticamente.

---

### Historia Clínica

| Expediente con alerta de alergias | Expediente guardado con diagnósticos |
|---|---|
| ![Alerta en expediente](docs/img/10.png) | ![Expediente guardado](docs/img/13.png) |

---

### IA — Extracción de Notas Clínicas (P2)

![Extracción IA](docs/img/11.png)

El médico escribe notas en lenguaje libre y Claude extrae estructuradamente diagnósticos, prescripciones y procedimientos mediante **Tool Calling + Structured Output**. Los medicamentos se resuelven contra el catálogo activo en tiempo real para evitar alucinaciones de IDs.

---

### IA — Sugerencia de Códigos ICD-10 (P1)

![ICD-10 RAG](docs/img/12.png)

Pipeline **RAG** de tres pasos: Query Expansion normaliza el lenguaje coloquial a terminología CIE-10, Vector Search recupera 20 candidatos de los 14.268 códigos indexados en pgvector, y Claude hace Reranking para devolver los 5 más apropiados.

---

### IA — Consulta de Historial en Lenguaje Natural (P3)

![Historial IA](docs/img/05.png)

El médico formula preguntas en lenguaje natural sobre el historial completo del paciente. La arquitectura **Dual Retrieval** clasifica la intención: queries específicas van por vector search, resúmenes completos van por contexto estructurado de base de datos. La respuesta incluye chips que navegan directamente al expediente fuente.

---

### Facturación

| Factura draft generada | Cobertura de seguro aplicada |
|---|---|
| ![Factura draft](docs/img/14.png) | ![Cobertura seguro](docs/img/16.png) |

| Registrar pago | Factura pagada |
|---|---|
| ![Registrar pago](docs/img/17.png) | ![Factura pagada](docs/img/18.png) |

---

### IA — Sugerencia de Ítems de Factura (P4)

![Sugerencia ítems](docs/img/15.png)

A partir del expediente clínico asociado, Claude sugiere servicios y medicamentos del catálogo mediante **Tool Calling**, con justificación clínica por ítem. Cada sugerencia se agrega individualmente con loading state independiente.

---

### Módulos de Soporte

| Gestión de Seguros | Catálogo de Servicios y Medicamentos |
|---|---|
| ![Seguros](docs/img/19.png) | ![Catálogo](docs/img/20.png) |

---

## Stack Tecnológico

| Capa | Backend | Frontend |
|---|---|---|
| Lenguaje | Java 21 | TypeScript 5.9 (strict) |
| Framework | Spring Boot 4 | React 19 + Vite 8 |
| Routing | — | TanStack Router 1.168 |
| Estado servidor | — | TanStack Query 5.94 |
| Persistencia | Spring Data JPA + Hibernate | — |
| Base de datos | PostgreSQL 15 + pgvector | — |
| Cache / sesiones | Redis 7 | — |
| Migraciones | Flyway | — |
| Seguridad | Spring Security + JWT (jjwt 0.12) | Axios interceptors |
| Validación | Jakarta Bean Validation | React Hook Form + Zod 4.3 |
| UI | — | Shadcn/ui + Radix UI + Tailwind 4 |
| Mapeo DTO | MapStruct 1.6 | — |
| Auditoría | JPA Auditing + AOP AspectJ | — |
| **IA — LLM** | **Spring AI 2.0 · Claude claude-sonnet-4-6** | **react-markdown + remark-gfm** |
| **IA — Embeddings** | **Google AI Studio · gemini-embedding-001 (768 dims)** | — |
| **IA — Vector store** | **pgvector (HNSW, cosine)** | — |
| Testing | JUnit 5 + Mockito + Testcontainers + JaCoCo | Vitest 4 + RTL 16 + Playwright 1.59 |

---

## Seguridad y Autorización

Autenticación **JWT stateless**: access token (15 min) + refresh token (7 días). El logout revoca el refresh token en Redis con TTL igual a la vida restante del token. El frontend implementa un mutex `refreshInFlight` para que múltiples requests concurrentes con 401 compartan una sola llamada de renovación.

### Matriz de Permisos

| Recurso | ADMIN | DOCTOR | RECEPTIONIST |
|---|---|---|---|
| Pacientes (escritura) | ✓ | — | ✓ |
| Médicos (escritura) | ✓ | — | — |
| Citas | ✓ | ✓ | ✓ |
| Completar cita | — | ✓ (propia) | — |
| Facturas | ✓ | — | ✓ (lectura + pagos) |
| Seguros (escritura) | ✓ | — | — |
| Catálogo (escritura) | ✓ | — | — |
| Historias clínicas | ✓ | ✓ | ✓ |
| Asistentes AI | ✓ | ✓ | ✓ |

Los permisos se aplican en tres niveles independientes: backend (`@PreAuthorize` / Spring Security), rutas frontend (`requireRole` en `beforeLoad`), y componentes (`useRolePermissions` deshabilita acciones).

---

## Reglas de Negocio Destacadas

**Validación de disponibilidad** — Al crear una cita el frontend consulta el endpoint de disponibilidad del médico para el día seleccionado y bloquea el submit si existe solapamiento temporal, sin depender del backend para la validación visual.

**Prescripciones requeridas** — Los medicamentos del catálogo pueden marcar `requiresPrescription = true`. Al intentar agregar uno a una factura, el backend valida que exista una prescripción para ese medicamento en la cita asociada (`prescriptionRepository.existsByAppointmentIdAndMedicationId`). Si no existe, lanza `BusinessRuleException` (422).

**Cobertura de seguro** — Al asignar una póliza a una factura, el backend recalcula en tiempo real `insuranceCoverage = (total × coveragePercentage / 100) − deductible` y actualiza `patientResponsibility`. Valida póliza activa, proveedor activo y vigencia de fechas.

**Numeración secuencial sin duplicados** — La generación del número de factura (`FAC-YYYY-NNNNN`) usa `SELECT FOR UPDATE` sobre `invoice_sequences` para garantizar unicidad bajo concurrencia.

**Cancelación con pagos (RN-14)** — No se puede cancelar una factura si ya tiene pagos aplicados.

**Auditoría dual** — Toda mutación sobre diagnósticos, prescripciones e ítems de factura genera un registro en `audit_log` con `old_values` y `new_values` en JSONB, capturado por `AuditAspect` después del commit de la transacción.

---

## Testing

### Backend — 412 tests, cobertura JaCoCo

| Alcance | Líneas | Branches |
|---|---|---|
| Global | ≥ 80 % | ≥ 65 % |
| `invoice*`, `payment*`, `appointment*` | ≥ 90 % | ≥ 75 % |

Flujos E2E verificados con base de datos real (Testcontainers):

- `AppointmentCompletionFlowE2ETest` — cita → completar → historia clínica + factura draft
- `InvoiceLifecyclePaymentFlowE2ETest` — draft → ítems → confirmar → pago parcial → pago total → PAID
- `MedicationPrescriptionFlowE2ETest` — medicamento con RX requerida → rechazo sin prescripción → éxito con prescripción
- `InsuranceCoverageFlowE2ETest` — asignar póliza → verificar cálculo de cobertura
- `CancellationRulesFlowE2ETest` — cancelar sin pagos (éxito) → cancelar con pagos (rechazo RN-14)

### Frontend — 740 tests

| Capa | Tests | Herramientas |
|---|---|---|
| Unit / componentes | 614 (49 archivos) | Vitest 4 + React Testing Library 16 |
| E2E | 126 (5 archivos) | Playwright 1.59 + Chromium |

---

## Estructura del Repositorio

```
/
├── backend/                 # Spring Boot 4 — API REST
│   ├── src/main/java/
│   │   └── com/fepdev/sfm/backend/
│   │       ├── config/      # Security, JPA, Cache, AI
│   │       ├── security/    # JWT, filtros, roles
│   │       ├── shared/      # BaseEntity, excepciones, AuditAspect
│   │       ├── domain/      # patient, doctor, appointment, medicalrecord,
│   │       │                # invoice, payment, insurance, catalog, auth
│   │       └── ai/          # P1 icd10 (RAG) · P2 extraction · P3 history · P4 suggestion
│   ├── src/main/resources/
│   │   ├── db/migration/    # Flyway V1–V11 (incluye pgvector)
│   │   └── data/cie-10.csv  # 14 268 códigos CIE-10 nivel 2–5
│   └── src/test/java/       # unit, web, persistence, integration/e2e
│
├── frontend/                # React 19 — Backoffice SPA
│   ├── src/
│   │   ├── features/        # auth, patients, doctors, appointments,
│   │   │                    # medical-records, invoices, insurance, catalog,
│   │   │                    # dashboard, ai
│   │   ├── components/      # AppShell, DataTable, AllergyAlert, BackToListButton
│   │   ├── lib/             # apiClient (Axios + interceptors), queryClient, utils
│   │   └── types/           # Espejo exacto de DTOs Java
│   ├── e2e/                 # Playwright specs
│   └── docs/                # Documentación técnica (testing, etc.)
│
├── docs/img/                # Capturas de pantalla del sistema
├── docker-compose.yml       # PostgreSQL 15 (pgvector) + Redis 7
├── DIAGRAMAS.md             # Diagramas de flujo, máquinas de estado y secuencia
└── DEPLOY.md                # Proceso de despliegue en la nube
```

---

## Levantar el Proyecto

### 1. Infraestructura

```bash
docker compose up -d
# PostgreSQL en :5434 — Redis en :6379
```

### 2. Variables de entorno

Crea un `.env` en la raíz del repositorio (ya está en `.gitignore`) con las claves de API:

```
GOOGLE_API_KEY=tu_clave_de_google_ai_studio
ANTHROPIC_API_KEY=tu_clave_de_anthropic
```

### 3. Backend

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
# API disponible en http://localhost:8080/api/v1
# Al iniciar: indexación asíncrona de 14 268 códigos ICD-10 en pgvector
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
# SPA disponible en http://localhost:5173
```

---

## Documentación

| Archivo | Contenido |
|---|---|
| [`DIAGRAMAS.md`](DIAGRAMAS.md) | Diagramas de flujo, máquinas de estado, secuencias JWT y IA |
| [`DEPLOY.md`](DEPLOY.md) | Proceso completo de despliegue en la nube (Heroku, Vercel, Neon, Upstash) |
| [`backend/README.md`](backend/README.md) | Documentación técnica del backend |
| [`frontend/README.md`](frontend/README.md) | Documentación técnica del frontend |
