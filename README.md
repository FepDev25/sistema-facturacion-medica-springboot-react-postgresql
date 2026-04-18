# Sistema de Facturación Médica (SFM)

Sistema clínico fullstack para la gestión de citas, historias clínicas y facturación con cobertura de seguros. El backend implementa una API RESTful sobre Spring Boot 4 con máquinas de estados explícitas, auditoría dual y 370 tests. El frontend es un backoffice React 19 con routing type-safe, estado del servidor con TanStack Query y una suite de 740 tests.

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
    end

    subgraph INFRA["Infraestructura"]
        PG[("PostgreSQL 15<br/>13 tablas, Flyway")]
        RD[("Redis 7<br/>JWT blacklist + Cache")]
    end

    UI -->|"HTTP + Bearer JWT"| SEC
    SEC --> API
    API --> SVC
    SVC --> PG
    AUDIT -.->|audit_log JSONB| PG
    SEC <-->|token blacklist| RD
    SVC <-->|catálogo TTL 2h| RD
```

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

### Máquina de estados — Citas

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

### Máquina de estados — Facturas

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

## Stack Tecnológico

| Capa | Backend | Frontend |
|---|---|---|
| Lenguaje | Java 21 | TypeScript 5.9 (strict) |
| Framework | Spring Boot 4 | React 19 + Vite 8 |
| Routing | — | TanStack Router 1.168 |
| Estado servidor | — | TanStack Query 5.94 |
| Persistencia | Spring Data JPA + Hibernate | — |
| Base de datos | PostgreSQL 15 | — |
| Cache / sesiones | Redis 7 | — |
| Migraciones | Flyway | — |
| Seguridad | Spring Security + JWT (jjwt 0.12) | Axios interceptors |
| Validación | Jakarta Bean Validation | React Hook Form + Zod 4.3 |
| UI | — | Shadcn/ui + Radix UI + Tailwind 4 |
| Mapeo DTO | MapStruct 1.6 | — |
| Auditoría | JPA Auditing + AOP AspectJ | — |
| Testing | JUnit 5 + Mockito + Testcontainers + JaCoCo | Vitest 4 + RTL 16 + Playwright 1.59 |

---

## Seguridad y Autorización

### Flujo JWT

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

El frontend implementa un mutex `refreshInFlight` en el interceptor de respuesta: si múltiples requests reciben 401 simultáneamente, solo se lanza una llamada al endpoint de refresh y todas esperan la misma promesa.

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

### Backend — 370 tests, cobertura JaCoCo

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

| Alcance | Líneas | Branches |
|---|---|---|
| Global | ≥ 80 % | ≥ 65 % |
| `invoice*`, `payment*`, `appointment*` | ≥ 90 % | ≥ 75 % |

Flujos E2E verificados con base de datos real:

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

Los E2E cubren los flujos críticos de usuario completos: auth por rol, CRUD de pacientes, ciclo de vida de citas, ciclo de facturación y matriz de permisos por rol.

---

## Estructura del Repositorio

```
/
├── backend/                 # Spring Boot 4 — API REST
│   ├── src/main/java/
│   │   └── com/fepdev/sfm/backend/
│   │       ├── config/      # Security, JPA, Cache
│   │       ├── security/    # JWT, filtros, roles
│   │       ├── shared/      # BaseEntity, excepciones, AuditAspect
│   │       └── domain/      # patient, doctor, appointment, medicalrecord,
│   │                        # invoice, payment, insurance, catalog, auth
│   ├── src/main/resources/
│   │   └── db/migration/    # Flyway V1–V8
│   └── src/test/java/       # unit, web, persistence, integration/e2e
│
├── frontend/                # React 19 — Backoffice SPA
│   ├── src/
│   │   ├── features/        # auth, patients, doctors, appointments,
│   │   │                    # medical-records, invoices, insurance, catalog, dashboard
│   │   ├── components/      # AppShell, DataTable, AllergyAlert, BackToListButton
│   │   ├── lib/             # apiClient (Axios + interceptors), queryClient, utils
│   │   └── types/           # Espejo exacto de DTOs Java
│   ├── e2e/                 # Playwright specs
│   └── docs/                # Documentación técnica (testing, etc.)
│
└── docker-compose.yml       # PostgreSQL 15 + Redis 7
```

---

## Levantar el Proyecto

### 1. Infraestructura

```bash
docker compose up -d
# PostgreSQL en :5434 — Redis en :6379
```

### 2. Backend

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
# API disponible en http://localhost:8080/api/v1
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# SPA disponible en http://localhost:5173
```

### Usuarios de desarrollo

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `doctor1` | `doctor123` | DOCTOR |
| `recep1` | `recep123` | RECEPTIONIST |

---

## Documentación por Módulo

| Módulo | README |
|---|---|
| Backend | [`backend/README.md`](backend/README.md) |
| Frontend | [`frontend/README.md`](frontend/README.md) |
| Testing frontend | [`frontend/docs/02-testing.md`](frontend/docs/02-testing.md) |
