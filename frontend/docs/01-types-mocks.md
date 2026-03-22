# Tipos TypeScript y Datos Mock

## Descripcion General

Las fases 1 y 2 del proyecto establecen la capa de contratos de datos: los tipos TypeScript que espajan los DTOs del backend Java, y los datos mock que espajan los seeds de la base de datos. Son las dos capas que habilitan el desarrollo del frontend sin conexion al backend.

---

## Fase 1 — Tipos TypeScript

### Principio de Diseno

Cada interfaz de TypeScript es el espejo directo del DTO correspondiente en el backend Java. El objetivo es que cuando se conecte el backend real, no sea necesario modificar ningún tipo del frontend. La correspondencia es:

| Java (backend) | TypeScript (frontend) |
|---|---|
| `PatientResponse.java` | `PatientResponse` en `patient.ts` |
| `InvoiceCreateRequest.java` | `InvoiceCreateRequest` en `invoice.ts` |
| `String` (UUID) | `string` |
| `LocalDate` | `string` (`"YYYY-MM-DD"`) |
| `OffsetDateTime` | `string` (ISO 8601 con offset) |
| `BigDecimal` | `number` |
| Enum (AttributeConverter) | `type` union de strings en lowercase |

Todos los campos opcionales del backend (`@Nullable`, `Optional`) se mapean como `T | null` en la respuesta y como `T | null | undefined` en el request (porque en el formulario el campo puede estar ausente o explícitamente nulo).

### Convenciones de Nomenclatura

Cada dominio tiene tres categorías de tipos:

| Sufijo | Uso |
|---|---|
| `CreateRequest` | Payload de POST — enviado por el cliente |
| `UpdateRequest` | Payload de PUT/PATCH — enviado por el cliente |
| `Response` | Objeto completo devuelto por la API (incluye `id`, `createdAt`, etc.) |
| `SummaryResponse` | Subconjunto reducido para embeber en otros objetos (evita respuestas anidadas profundas) |

### Estructura de Archivos

```
src/types/
├── common.ts          # PageResponse<T>, ApiError, FieldError
├── enums.ts           # 7 enums + 7 mapas de etiquetas en español
├── patient.ts         # PatientCreateRequest, PatientUpdateRequest, PatientResponse, PatientSummaryResponse
├── doctor.ts          # DoctorCreateRequest, DoctorUpdateRequest, DoctorResponse, DoctorSummaryResponse
├── insurance.ts       # InsuranceProvider* + InsurancePolicy*
├── appointment.ts     # AppointmentCreateRequest, AppointmentResponse, AppointmentSummaryResponse, etc.
├── medical-record.ts  # VitalSigns, MedicalRecord*, Diagnosis*, Prescription*, Procedure*
├── catalog.ts         # Service*, Medication*, CatalogPriceHistory*
├── invoice.ts         # Invoice*, InvoiceItem*, InvoiceSummary*, Payment*
└── index.ts           # Barrel export de todos los tipos
```

---

### `common.ts`

Tipos de infraestructura compartidos por todos los dominios.

**`PageResponse<T>`** — Espeja la clase `Page<T>` de Spring Data. Todos los endpoints de lista devuelven esta forma:

```typescript
export interface PageResponse<T> {
  content: T[]        // elementos de la página actual
  totalElements: number
  totalPages: number
  number: number      // página actual (base 0)
  size: number        // tamaño de la página
  first: boolean
  last: boolean
  empty: boolean
}
```

**`ApiError`** — Forma del cuerpo de error del `@RestControllerAdvice` del backend:

```typescript
export interface ApiError {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
  fieldErrors?: FieldError[]  // presente en errores de validacion (400)
}

export interface FieldError {
  field: string
  message: string
}
```

---

### `enums.ts`

Los enums del backend Java usan un `AttributeConverter` con `autoApply = true` que persiste cada valor como su nombre en lowercase. En el frontend se representan como union types de strings literales, nunca como TypeScript `enum` (prohibido por `erasableSyntaxOnly`).

**Enums definidos:**

| Nombre | Valores |
|---|---|
| `Gender` | `'male' \| 'female' \| 'other' \| 'prefer_not_to_say'` |
| `AppointmentStatus` | `'scheduled' \| 'confirmed' \| 'in_progress' \| 'completed' \| 'cancelled' \| 'no_show'` |
| `InvoiceStatus` | `'draft' \| 'pending' \| 'partial_paid' \| 'paid' \| 'cancelled' \| 'overdue'` |
| `Severity` | `'mild' \| 'moderate' \| 'severe' \| 'critical'` |
| `ItemType` | `'service' \| 'medication' \| 'procedure' \| 'other'` |
| `PaymentMethod` | `'cash' \| 'credit_card' \| 'debit_card' \| 'bank_transfer' \| 'check' \| 'insurance' \| 'other'` |
| `ServiceCategory` | `'consultation' \| 'laboratory' \| 'imaging' \| 'surgery' \| 'therapy' \| 'emergency' \| 'other'` |
| `MedicationUnit` | `'tablet' \| 'capsule' \| 'ml' \| 'mg' \| 'g' \| 'unit' \| 'box' \| 'vial' \| 'inhaler'` |
| `CatalogType` | `'service' \| 'medication'` |

Junto a cada enum se exporta un mapa de etiquetas en español para el UI. Ejemplo:

```typescript
export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  in_progress: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No se presentó',
}
```

El uso de `Record<EnumType, string>` garantiza exhaustividad: si se agrega un valor al enum sin actualizar el mapa, TypeScript lo reporta como error.

---

### `medical-record.ts` — VitalSigns

`VitalSigns` es el único tipo del proyecto con una firma de índice. La razón es que el backend persiste los signos vitales como JSONB sin un schema fijo. El frontend conoce los campos habituales pero debe poder renderizar cualquier clave arbitraria que llegue del servidor.

```typescript
export interface VitalSigns {
  bloodPressure?: string      // "120/80 mmHg"
  heartRate?: number          // bpm
  temperature?: number        // °C
  oxygenSaturation?: number   // %
  weight?: number             // kg
  height?: number             // cm
  glucose?: number            // mg/dL
  [key: string]: string | number | undefined  // campos desconocidos
}
```

La firma de índice `[key: string]: T` obliga a que todos los campos conocidos sean compatibles con el tipo de los desconocidos. Por eso todos los campos tipados son opcionales (`?`) y usan `string | number`, no tipos más específicos.

En el UI, los campos conocidos se renderizan con sus etiquetas en español. Los campos desconocidos aparecen en una sección "Otros" como pares clave/valor genéricos.

---

### `invoice.ts` — Campos calculados del servidor

Los campos `invoiceNumber`, `subtotal`, `tax`, `total`, `insuranceCoverage` y `patientResponsibility` los calcula el backend al persistir la factura. El `InvoiceCreateRequest` no los incluye; el `InvoiceResponse` sí.

```typescript
// El cliente NO envía estos campos:
export interface InvoiceCreateRequest {
  patientId: string
  appointmentId?: string | null
  insurancePolicyId?: string | null
  items: InvoiceItemRequest[]
  dueDate: string
  notes?: string | null
}

// El servidor los devuelve calculados:
export interface InvoiceResponse {
  id: string
  invoiceNumber: string         // "FAC-00001"
  subtotal: number              // suma de items
  tax: number                   // IVA (0% en servicios médicos)
  total: number                 // subtotal + tax
  insuranceCoverage: number     // total * (coveragePercentage / 100)
  patientResponsibility: number // total - insuranceCoverage
  // ...
}
```

---

## Fase 2 — Datos Mock

### Principio de Diseno

Los mocks espajan exactamente el archivo `V5__seeds.sql` del backend. Esto implica:

- Los mismos UUIDs en el mismo orden
- Los mismos valores en campos de texto, fechas y cantidades
- Las mismas relaciones entre entidades

Cuando el backend esté disponible, las funciones de API pueden reemplazarse directamente porque la forma de los datos es idéntica.

### Convencion de UUIDs

Los UUIDs en los seeds del backend usan el campo inicial para identificar la entidad visualmente. La secuencia completa es:

| Prefijo | Entidad |
|---|---|
| `a0000000-...` | patients |
| `b0000000-...` | doctors |
| `c0000000-...` | insurance_providers |
| `d0000000-...` | insurance_policies |
| `e0000000-...` | services_catalog |
| `f0000000-...` | medications_catalog |
| `10000000-...` | appointments |
| `20000000-...` | medical_records |
| `30000000-...` | diagnoses |
| `40000000-...` | prescriptions |
| `50000000-...` | procedures |
| `60000000-...` | invoices |
| `70000000-...` | payments |
| `80000000-...` | invoice_items |

Los prefijos `a`-`f` son hexadecimales válidos. A partir de `g`, el formato UUID se vuelve inválido (solo acepta `0-9` y `a-f`). Por eso se usó la secuencia numérica `10`, `20`, `30`... para las entidades con prefijo mayor a `f`.

### Patron de Cada Archivo Mock

Cada archivo de mock exporta dos estructuras:

**1. Array completo** (`PATIENTS_MOCK`, `INVOICES_MOCK`, etc.)
Usado por las funciones API de lista. Contiene objetos `*Response` completos con todos sus campos y relaciones embebidas.

**2. Mapa de summaries** (`PATIENT_SUMMARIES`, `INVOICE_SUMMARIES`, etc.)
Lookup indexado por UUID. Usado para armar relaciones embebidas en otros mocks sin repetir datos. Ejemplo: `APPOINTMENT_SUMMARIES` se importa en `invoices.mock.ts` para poblar el campo `appointment` de cada factura.

```typescript
// Patron de un archivo mock
export const PATIENTS_MOCK: PatientResponse[] = [ /* 10 objetos */ ]

export const PATIENT_SUMMARIES: Record<string, PatientSummaryResponse> = {
  'a0000000-0000-0000-0000-000000000001': { id: '...', fullName: '...', ... },
  // ...
}
```

### Estructura de Archivos

```
src/mocks/
├── patients.mock.ts            # 10 pacientes
├── doctors.mock.ts             # 6 doctores (5 especialidades)
├── insurance-providers.mock.ts # 4 aseguradoras
├── insurance-policies.mock.ts  # 6 pólizas (4 activas, 2 vencidas)
├── services-catalog.mock.ts    # 15 servicios (consultas, lab, imagenología, terapia, urgencias)
├── medications-catalog.mock.ts # 20 medicamentos (19 activos, 1 descontinuado)
├── appointments.mock.ts        # 15 citas (varios estados)
├── medical-records.mock.ts     # 10 expedientes con diagnósticos, recetas y procedimientos
├── invoices.mock.ts            # 10 facturas con items y pagos embebidos
├── payments.mock.ts            # Lista plana de todos los pagos (derivada de invoices)
└── index.ts                    # Barrel export
```

---

### Datos de Cada Dominio

#### Pacientes (10)

IDs `a0000000-...-00001` a `a0000000-...-00010`. Incluyen casos clínicamente relevantes para el UI:

| Caso especial | Paciente |
|---|---|
| Alergias documentadas (`allergies` no nulo) | Pacientes 1, 9 |
| Menor de edad | Paciente 4 |
| Embarazo activo | Paciente 5 |
| Sin seguro activo | Pacientes 1, 3, 6, 8, 9, 10 |

El campo `allergies` es texto libre. En el UI se renderiza como `AllergyAlert` (banner amber/red) cuando está presente.

#### Doctores (6)

IDs `b0000000-...-00001` a `b0000000-...-00006`. Cinco especialidades representadas:

| ID | Especialidad |
|---|---|
| `...001`, `...006` | Medicina General |
| `...002` | Pediatría |
| `...003` | Cardiología |
| `...004` | Ginecología y Obstetricia |
| `...005` | Traumatología y Ortopedia |

#### Pólizas de Seguro (6)

IDs `d0000000-...-00001` a `d0000000-...-00006`. Incluyen casos extremos:

| Caso | Póliza |
|---|---|
| Cobertura 100% (sin copago) | `d...003` — paciente 5 |
| Póliza vencida | `d...004`, `d...006` |
| Cobertura 60% | `d...005` — paciente 7 |

Las pólizas vencidas están marcadas con `isActive: false`. Los mocks de facturas que corresponden a pacientes con póliza vencida reflejan `insurancePolicy: null` e `insuranceCoverage: 0`.

#### Servicios del Catálogo (15)

IDs `e0000000-...-00001` a `e0000000-...-00015`. El ítem `e...015` está marcado `isActive: false` (servicio descontinuado). Categorías:

| Categoría | IDs |
|---|---|
| `consultation` | `e...001`, `e...002`, `e...003` |
| `laboratory` | `e...004`, `e...005`, `e...006`, `e...007` |
| `imaging` | `e...008`, `e...009`, `e...010` |
| `therapy` | `e...011`, `e...012`, `e...013` |
| `emergency` | `e...014` |
| `other` (descontinuado) | `e...015` |

#### Medicamentos del Catálogo (20)

IDs `f0000000-...-00001` a `f0000000-...-00020`. El ítem `f...020` está marcado `isActive: false`. Los summaries solo exportan los medicamentos que aparecen en recetas reales de los expedientes.

#### Citas (15)

IDs `10000000-...-00001` a `10000000-...-00015`. Distribución de estados:

| Estado | Cantidad | IDs |
|---|---|---|
| `completed` | 11 | 1–7, 9, 10, 14, 15 |
| `cancelled` | 1 | 8 |
| `no_show` | 1 | 11 |
| `scheduled` | 1 | 12 |
| `confirmed` | 1 | 13 |
| `in_progress` | 1 | 14 |

Las citas `scheduled`, `confirmed` e `in_progress` tienen fechas en el futuro (2026-02-06 a 2026-03-15) relativas a la fecha del sistema del proyecto.

Los summaries solo exportan las citas que son referenciadas en expedientes o facturas.

#### Expedientes Médicos (10)

IDs `20000000-...-00001` a `20000000-...-00015` (con algunos huecos para mantener coherencia con los seeds). Cada expediente contiene:

- `vitalSigns`: objeto `VitalSigns` con 4–6 campos medidos en la consulta
- `diagnoses[]`: 1–2 diagnósticos con código CIE-10, descripción y severidad
- `prescriptions[]`: 0–3 recetas, cada una con referencia a un `MedicationSummaryResponse`
- `procedures[]`: 0–2 procedimientos

Las recetas referencian los mismos medicamentos que aparecen en los items de facturas correspondientes para mantener coherencia clínica.

#### Facturas (10)

IDs `60000000-...-00001` a `60000000-...-00010`. Formato de número: `FAC-00001` a `FAC-00010`. Distribución de estados:

| Estado | Cantidad | Facturas |
|---|---|---|
| `paid` | 7 | FAC-00001, 00002, 00004, 00005, 00007, 00009, 00010 |
| `partial_paid` | 1 | FAC-00006 |
| `pending` | 1 | FAC-00008 |
| `overdue` | 1 | FAC-00003 |

**Nota sobre los seeds del backend:** El script `V5__seeds.sql` inserta la mayoría de las facturas con estado `'draft'` (el estado inicial por defecto en el esquema). Los mocks del frontend usan estados finales realistas en su lugar porque `draft` no representa ningún escenario clínico de las citas completadas. Esta discrepancia es intencional y documentada.

**Calculo de cobertura:**

| Factura | Póliza | Cobertura | Total | Responsabilidad paciente |
|---|---|---|---|---|
| FAC-00001 | Sin seguro | 0% | $2,210 | $2,210 |
| FAC-00002 | d...001 | 80% | $4,400 | $880 |
| FAC-00003 | Sin seguro | 0% | $950 | $950 |
| FAC-00004 | d...002 | 90% | $975 | $97.50 |
| FAC-00005 | d...003 | 100% | $3,200 | $0 |
| FAC-00006 | Sin seguro (póliza vencida) | 0% | $4,380 | $4,380 |
| FAC-00007 | d...005 | 60% | $1,720 | $688 |
| FAC-00008 | Sin seguro | 0% | $1,575 | $1,575 |
| FAC-00009 | Sin seguro | 0% | $600 | $600 |
| FAC-00010 | d...005 | 60% | $2,650 | $1,060 |

#### Items de Factura

IDs `80000000-...-00001` a `80000000-...-00025`. Cada item referencia o un `ServiceSummaryResponse` o un `MedicationSummaryResponse` (nunca ambos). El campo no usado se establece como `null`.

El tipo de item (`itemType`) determina cuál campo se usa:

| `itemType` | Campo con valor | Campo nulo |
|---|---|---|
| `'service'` | `service` | `medication` |
| `'medication'` | `medication` | `service` |

#### Pagos (10)

IDs `70000000-...-00001` a `70000000-...-00010`. Los pagos son exclusivamente cobros al paciente. La cobertura del seguro se refleja como reducción del campo `patientResponsibility` en la factura, no como un pago separado.

Los pagos se definen directamente dentro de `invoices.mock.ts` en el objeto `PAYMENTS_BY_INVOICE` (indexado por `invoiceId`). El archivo `payments.mock.ts` deriva su lista plana a partir de ese objeto:

```typescript
// payments.mock.ts
export const PAYMENTS_MOCK: PaymentResponse[] = Object.values(PAYMENTS_BY_INVOICE)
  .flat()
  .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
```

Este enfoque evita duplicar datos. Las facturas contienen sus pagos embebidos (como los devolvería la API real), y la vista de pagos obtiene la lista plana sin mantener un segundo conjunto de datos.

Facturas con múltiples pagos (abonos):

| Factura | Pagos | Motivo |
|---|---|---|
| FAC-00001 | 2 ($1,000 + $1,210) | El paciente pagó en dos partes |
| FAC-00006 | 2 ($2,000 + $1,000) | Pago acordado en abonos (póliza vencida) |
| FAC-00010 | 2 ($560 + $500) | Transferencia + tarjeta de débito |

---

### Dependencias entre Archivos Mock

El orden de imports entre los archivos respeta la jerarquía de dependencias del dominio:

```
patients.mock.ts
doctors.mock.ts
insurance-providers.mock.ts
    ↓ importa patients + providers
insurance-policies.mock.ts
services-catalog.mock.ts
medications-catalog.mock.ts
    ↓ importa patients + doctors
appointments.mock.ts
    ↓ importa patients + appointments + medications
medical-records.mock.ts
    ↓ importa patients + appointments + insurance-policies + services + medications
invoices.mock.ts
    ↓ deriva de invoices (sin importar de este)
payments.mock.ts
```

No hay dependencias circulares. Los summaries son los que permiten este esquema: en lugar de importar el objeto completo de otro dominio, cada mock importa solo el `*_SUMMARIES` del dominio padre.

---

## Verificacion

Ambas fases se verifican con el compilador de TypeScript en modo `noEmit` y con el build de Vite:

```bash
# Verificar tipos sin emitir archivos
npx tsc -p tsconfig.app.json --noEmit

# Build completo (incluye tree-shaking y comprobacion de imports)
npm run build
```

Ambos comandos deben completarse sin errores ni warnings. El CI de desarrollo los ejecuta antes de cada merge.
