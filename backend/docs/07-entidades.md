# Entidades JPA

Referencia de todas las entidades del dominio y su mapeo a la base de datos. Incluye la justificacion de cada decision de diseno.

---

## Arquitectura General

### BaseEntity

Clase base abstracta (`@MappedSuperclass`) de la que heredan todas las entidades con PK UUID y auditoria automatica.

| Campo Java | Columna BD | Tipo Java | Tipo SQL |
|---|---|---|---|
| `id` | `id` | `UUID` | `UUID PRIMARY KEY` |
| `createdAt` | `created_at` | `OffsetDateTime` | `TIMESTAMPTZ NOT NULL` |
| `updatedAt` | `updated_at` | `OffsetDateTime` | `TIMESTAMPTZ NOT NULL` |

`@CreatedDate` y `@LastModifiedDate` requieren `@EnableJpaAuditing` en `JpaConfig`. El id se genera con `GenerationType.UUID` (Hibernate 6+).

Las entidades que **no** extienden `BaseEntity` son aquellas que no tienen `updated_at` en la BD (`Diagnosis`, `Prescription`, `Procedure`, `Payment`, `InvoiceItem`, `CatalogPriceHistory`) o que tienen una PK no UUID (`InvoiceSequence`).

### Convencion de enums

Todos los enums usan `AttributeConverter` con `autoApply = true` para persistirse como su valor en minusculas (`MALE` → `"male"`). No se usa `@Enumerated` porque ese mecanismo no pasa por el converter.

---

## Patient

**Tabla:** `patients` | **Paquete:** `domain/patient`

| Campo Java | Columna BD | Tipo Java | Tipo SQL | Nullable |
|---|---|---|---|---|
| `id` | `id` | `UUID` | `UUID` | NO |
| `dni` | `dni` | `String` | `VARCHAR(20) UNIQUE` | NO |
| `firstName` | `first_name` | `String` | `VARCHAR(100)` | NO |
| `lastName` | `last_name` | `String` | `VARCHAR(100)` | NO |
| `birthDate` | `birth_date` | `LocalDate` | `DATE` | NO |
| `gender` | `gender` | `Gender` | `VARCHAR(20)` | NO |
| `phone` | `phone` | `String` | `VARCHAR(20)` | NO |
| `email` | `email` | `String` | `VARCHAR(100)` | SI |
| `address` | `address` | `String` | `TEXT` | SI |
| `bloodType` | `blood_type` | `String` | `VARCHAR(5)` | SI |
| `allergies` | `allergies` | `String` | `TEXT` | SI |
| `createdAt` | `created_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |
| `updatedAt` | `updated_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |

**Enum `Gender`:** `MALE`, `FEMALE`, `OTHER`, `PREFER_NOT_TO_SAY`

---

## Doctor

**Tabla:** `doctors` | **Paquete:** `domain/doctor`

| Campo Java | Columna BD | Tipo Java | Tipo SQL | Nullable |
|---|---|---|---|---|
| `id` | `id` | `UUID` | `UUID` | NO |
| `licenseNumber` | `license_number` | `String` | `VARCHAR(50) UNIQUE` | NO |
| `firstName` | `first_name` | `String` | `VARCHAR(100)` | NO |
| `lastName` | `last_name` | `String` | `VARCHAR(100)` | NO |
| `specialty` | `specialty` | `String` | `VARCHAR(100)` | NO |
| `phone` | `phone` | `String` | `VARCHAR(20)` | NO |
| `email` | `email` | `String` | `VARCHAR(100)` | NO |
| `isActive` | `is_active` | `boolean` | `BOOLEAN` | NO |
| `createdAt` | `created_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |
| `updatedAt` | `updated_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |

---

## InsuranceProvider

**Tabla:** `insurance_providers` | **Paquete:** `domain/insurance`

| Campo Java | Columna BD | Tipo Java | Tipo SQL | Nullable |
|---|---|---|---|---|
| `id` | `id` | `UUID` | `UUID` | NO |
| `name` | `name` | `String` | `VARCHAR(200)` | NO |
| `code` | `code` | `String` | `VARCHAR(50) UNIQUE` | NO |
| `phone` | `phone` | `String` | `VARCHAR(20)` | NO |
| `email` | `email` | `String` | `VARCHAR(100)` | SI |
| `address` | `address` | `String` | `TEXT` | SI |
| `isActive` | `is_active` | `boolean` | `BOOLEAN` | NO |
| `createdAt` | `created_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |
| `updatedAt` | `updated_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |

---

## InsurancePolicy

**Tabla:** `insurance_policies` | **Paquete:** `domain/insurance`

| Campo Java | Columna BD | Tipo Java | Tipo SQL | Nullable |
|---|---|---|---|---|
| `id` | `id` | `UUID` | `UUID` | NO |
| `patient` | `patient_id` | `Patient` | `UUID FK` | NO |
| `provider` | `provider_id` | `InsuranceProvider` | `UUID FK` | NO |
| `policyNumber` | `policy_number` | `String` | `VARCHAR(100) UNIQUE` | NO |
| `coveragePercentage` | `coverage_percentage` | `BigDecimal` | `NUMERIC(5,2)` | NO |
| `deductible` | `deductible` | `BigDecimal` | `NUMERIC(10,2)` | NO |
| `startDate` | `start_date` | `LocalDate` | `DATE` | NO |
| `endDate` | `end_date` | `LocalDate` | `DATE` | NO |
| `isActive` | `is_active` | `boolean` | `BOOLEAN` | NO |
| `createdAt` | `created_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |
| `updatedAt` | `updated_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |

---

## Appointment

**Tabla:** `appointments` | **Paquete:** `domain/appointment`

| Campo Java | Columna BD | Tipo Java | Tipo SQL | Nullable |
|---|---|---|---|---|
| `id` | `id` | `UUID` | `UUID` | NO |
| `patient` | `patient_id` | `Patient` | `UUID FK` | NO |
| `doctor` | `doctor_id` | `Doctor` | `UUID FK` | NO |
| `scheduledAt` | `scheduled_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |
| `scheduledEndAt` | `scheduled_end_at` | `OffsetDateTime` | `TIMESTAMPTZ` | SI |
| `durationMinutes` | `duration_minutes` | `Integer` | `INTEGER` | NO |
| `status` | `status` | `AppointmentStatus` | `VARCHAR(20)` | NO |
| `chiefComplaint` | `chief_complaint` | `String` | `TEXT` | SI |
| `notes` | `notes` | `String` | `TEXT` | SI |
| `createdAt` | `created_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |
| `updatedAt` | `updated_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |

`scheduledEndAt` es calculado y persistido por `AppointmentService` como `scheduledAt + durationMinutes`. No se puede calcular en un indice de BD porque `timestamptz + interval` tiene volatilidad `STABLE` en PostgreSQL (ver `03-problemas-conocidos.md`).

**Enum `AppointmentStatus`** (clase `Status`): `SCHEDULED`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW`

---

## MedicalRecord

**Tabla:** `medical_records` | **Paquete:** `domain/medicalrecord`

| Campo Java | Columna BD | Tipo Java | Tipo SQL | Nullable |
|---|---|---|---|---|
| `id` | `id` | `UUID` | `UUID` | NO |
| `patient` | `patient_id` | `Patient` | `UUID FK` | NO |
| `appointment` | `appointment_id` | `Appointment` | `UUID FK UNIQUE` | NO |
| `vitalSigns` | `vital_signs` | `Map<String, Object>` | `JSONB` | SI |
| `physicalExam` | `physical_exam` | `String` | `TEXT` | SI |
| `clinicalNotes` | `clinical_notes` | `String` | `TEXT` | NO |
| `recordDate` | `record_date` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |
| `createdAt` | `created_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |
| `updatedAt` | `updated_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |

`vitalSigns` se mapea a `JSONB` mediante `@JdbcTypeCode(SqlTypes.JSON)`. El campo `appointment_id` tiene un UNIQUE constraint (`uq_medical_records_appointment`, V4): una cita produce exactamente un expediente.

---

## Diagnosis

**Tabla:** `diagnoses` | **Paquete:** `domain/medicalrecord`

No extiende `BaseEntity` porque la tabla no tiene `updated_at`.

| Campo Java | Columna BD | Tipo Java | Tipo SQL | Nullable |
|---|---|---|---|---|
| `id` | `id` | `UUID` | `UUID` | NO |
| `appointment` | `appointment_id` | `Appointment` | `UUID FK` | NO |
| `medicalRecord` | `medical_record_id` | `MedicalRecord` | `UUID FK` | NO |
| `icd10Code` | `icd10_code` | `String` | `VARCHAR(10)` | NO |
| `description` | `description` | `String` | `TEXT` | NO |
| `severity` | `severity` | `Severity` | `VARCHAR(20)` | SI |
| `diagnosedAt` | `diagnosed_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |
| `createdAt` | `created_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |

**Enum `Severity`:** `MILD`, `MODERATE`, `SEVERE`, `CRITICAL`

---

## Prescription

**Tabla:** `prescriptions` | **Paquete:** `domain/medicalrecord`

No extiende `BaseEntity` porque la tabla no tiene `updated_at`.

| Campo Java | Columna BD | Tipo Java | Tipo SQL | Nullable |
|---|---|---|---|---|
| `id` | `id` | `UUID` | `UUID` | NO |
| `appointment` | `appointment_id` | `Appointment` | `UUID FK` | NO |
| `medicalRecord` | `medical_record_id` | `MedicalRecord` | `UUID FK` | NO |
| `medication` | `medication_id` | `MedicationsCatalog` | `UUID FK` | NO |
| `dosage` | `dosage` | `String` | `TEXT` | NO |
| `frequency` | `frequency` | `String` | `TEXT` | NO |
| `durationDays` | `duration_days` | `Integer` | `INTEGER` | NO |
| `instructions` | `instructions` | `String` | `TEXT` | SI |
| `createdAt` | `created_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |

---

## Procedure

**Tabla:** `procedures` | **Paquete:** `domain/medicalrecord`

No extiende `BaseEntity` porque la tabla no tiene `updated_at`.

| Campo Java | Columna BD | Tipo Java | Tipo SQL | Nullable |
|---|---|---|---|---|
| `id` | `id` | `UUID` | `UUID` | NO |
| `appointment` | `appointment_id` | `Appointment` | `UUID FK` | NO |
| `medicalRecord` | `medical_record_id` | `MedicalRecord` | `UUID FK` | NO |
| `procedureCode` | `procedure_code` | `String` | `VARCHAR(50)` | NO |
| `description` | `description` | `String` | `TEXT` | NO |
| `notes` | `notes` | `String` | `TEXT` | SI |
| `performedAt` | `performed_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |
| `createdAt` | `created_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |

---

## ServicesCatalog

**Tabla:** `services_catalog` | **Paquete:** `domain/catalog`

| Campo Java | Columna BD | Tipo Java | Tipo SQL | Nullable |
|---|---|---|---|---|
| `id` | `id` | `UUID` | `UUID` | NO |
| `code` | `code` | `String` | `VARCHAR(50) UNIQUE` | NO |
| `name` | `name` | `String` | `VARCHAR(200)` | NO |
| `description` | `description` | `String` | `TEXT` | SI |
| `price` | `price` | `BigDecimal` | `NUMERIC(10,2)` | NO |
| `category` | `category` | `Category` | `VARCHAR(100)` | NO |
| `isActive` | `is_active` | `Boolean` | `BOOLEAN` | NO |
| `createdAt` | `created_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |
| `updatedAt` | `updated_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |

**Enum `Category`:** `CONSULTATION`, `LABORATORY`, `IMAGING`, `SURGERY`, `THERAPY`, `EMERGENCY`, `OTHER`

---

## MedicationsCatalog

**Tabla:** `medications_catalog` | **Paquete:** `domain/catalog`

| Campo Java | Columna BD | Tipo Java | Tipo SQL | Nullable |
|---|---|---|---|---|
| `id` | `id` | `UUID` | `UUID` | NO |
| `code` | `code` | `String` | `VARCHAR(50) UNIQUE` | NO |
| `name` | `name` | `String` | `VARCHAR(200)` | NO |
| `description` | `description` | `String` | `TEXT` | SI |
| `price` | `price` | `BigDecimal` | `NUMERIC(10,2)` | NO |
| `unit` | `unit` | `Unit` | `VARCHAR(50)` | NO |
| `requiresPrescription` | `requires_prescription` | `boolean` | `BOOLEAN` | NO |
| `isActive` | `is_active` | `boolean` | `BOOLEAN` | NO |
| `createdAt` | `created_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |
| `updatedAt` | `updated_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |

**Enum `Unit`:** `TABLET`, `CAPSULE`, `ML`, `MG`, `G`, `UNIT`, `BOX`, `VIAL`, `INHALER`

---

## CatalogPriceHistory

**Tabla:** `catalog_price_history` | **Paquete:** `domain/catalog`

Tabla de solo insercion. No extiende `BaseEntity` porque no tiene `updated_at` y el timestamp se llama `changed_at`. La capa de servicio escribe aqui dentro de la misma transaccion que actualiza el precio (RN-18).

| Campo Java | Columna BD | Tipo Java | Tipo SQL | Nullable |
|---|---|---|---|---|
| `id` | `id` | `UUID` | `UUID` | NO |
| `catalogType` | `catalog_type` | `CatalogType` | `VARCHAR(20)` | NO |
| `catalogId` | `catalog_id` | `UUID` | `UUID` | NO |
| `itemCode` | `item_code` | `String` | `VARCHAR(50)` | NO |
| `itemName` | `item_name` | `String` | `VARCHAR(200)` | NO |
| `oldPrice` | `old_price` | `BigDecimal` | `NUMERIC(10,2)` | NO |
| `newPrice` | `new_price` | `BigDecimal` | `NUMERIC(10,2)` | NO |
| `changedAt` | `changed_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |

`catalogId` es un UUID plano (no FK declarada en BD) porque puede referenciar tanto `services_catalog` como `medications_catalog`. El tipo se discrimina con `catalogType`.

**Enum `CatalogType`:** `SERVICE`, `MEDICATION`

---

## Invoice

**Tabla:** `invoices` | **Paquete:** `domain/invoice`

| Campo Java | Columna BD | Tipo Java | Tipo SQL | Nullable |
|---|---|---|---|---|
| `id` | `id` | `UUID` | `UUID` | NO |
| `invoiceNumber` | `invoice_number` | `String` | `VARCHAR(50) UNIQUE` | NO |
| `patient` | `patient_id` | `Patient` | `UUID FK` | NO |
| `appointment` | `appointment_id` | `Appointment` | `UUID FK` | SI |
| `insurancePolicy` | `insurance_policy_id` | `InsurancePolicy` | `UUID FK` | SI |
| `subtotal` | `subtotal` | `BigDecimal` | `NUMERIC(10,2)` | NO |
| `tax` | `tax` | `BigDecimal` | `NUMERIC(10,2)` | NO |
| `total` | `total` | `BigDecimal` | `NUMERIC(10,2)` | NO |
| `insuranceCoverage` | `insurance_coverage` | `BigDecimal` | `NUMERIC(10,2)` | NO |
| `patientResponsibility` | `patient_responsibility` | `BigDecimal` | `NUMERIC(10,2)` | NO |
| `status` | `status` | `InvoiceStatus` | `VARCHAR(20)` | NO |
| `issueDate` | `issue_date` | `LocalDate` | `DATE` | NO |
| `dueDate` | `due_date` | `LocalDate` | `DATE` | NO |
| `notes` | `notes` | `String` | `TEXT` | SI |
| `createdAt` | `created_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |
| `updatedAt` | `updated_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |

`appointment_id` es nullable desde V4: permite facturar servicios de emergencia sin cita previa registrada. En ese caso, `notes` es obligatorio (constraint `chk_invoices_requires_reference`).

**Enum `InvoiceStatus`** (clase `Status`): `DRAFT`, `PENDING`, `PARTIAL_PAID`, `PAID`, `CANCELLED`, `OVERDUE`

---

## InvoiceItem

**Tabla:** `invoice_items` | **Paquete:** `domain/invoice`

No extiende `BaseEntity` porque la tabla no tiene `updated_at`.

| Campo Java | Columna BD | Tipo Java | Tipo SQL | Nullable |
|---|---|---|---|---|
| `id` | `id` | `UUID` | `UUID` | NO |
| `invoice` | `invoice_id` | `Invoice` | `UUID FK CASCADE` | NO |
| `service` | `service_id` | `ServicesCatalog` | `UUID FK` | SI |
| `medication` | `medication_id` | `MedicationsCatalog` | `UUID FK` | SI |
| `itemType` | `item_type` | `ItemType` | `VARCHAR(20)` | NO |
| `description` | `description` | `String` | `TEXT` | NO |
| `quantity` | `quantity` | `Integer` | `INTEGER` | NO |
| `unitPrice` | `unit_price` | `BigDecimal` | `NUMERIC(10,2)` | NO |
| `subtotal` | `subtotal` | `BigDecimal` | `NUMERIC(10,2)` | NO |
| `createdAt` | `created_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |

`service_id` y `medication_id` son mutuamente exclusivos segun `item_type` (constraint `chk_invoice_items_reference`).

**Enum `ItemType`:** `SERVICE`, `MEDICATION`, `PROCEDURE`, `OTHER`

---

## InvoiceSequence

**Tabla:** `invoice_sequences` | **Paquete:** `domain/invoice`

Entidad especial: PK es `year` (INTEGER), no UUID. No extiende `BaseEntity`.

| Campo Java | Columna BD | Tipo Java | Tipo SQL | Nullable |
|---|---|---|---|---|
| `year` | `year` | `Integer` | `INTEGER PRIMARY KEY` | NO |
| `lastSequence` | `last_sequence` | `Integer` | `INTEGER` | NO |

Usada exclusivamente por `InvoiceService` con `SELECT ... FOR UPDATE` para generar numeros `FAC-YYYY-NNNNN` sin race conditions.

---

## Payment

**Tabla:** `payments` | **Paquete:** `domain/payment`

No extiende `BaseEntity` porque la tabla no tiene `updated_at`.

| Campo Java | Columna BD | Tipo Java | Tipo SQL | Nullable |
|---|---|---|---|---|
| `id` | `id` | `UUID` | `UUID` | NO |
| `invoice` | `invoice_id` | `Invoice` | `UUID FK` | NO |
| `amount` | `amount` | `BigDecimal` | `NUMERIC(10,2)` | NO |
| `paymentMethod` | `payment_method` | `PaymentMethod` | `VARCHAR(50)` | NO |
| `referenceNumber` | `reference_number` | `String` | `VARCHAR(100)` | SI |
| `notes` | `notes` | `String` | `TEXT` | SI |
| `paymentDate` | `payment_date` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |
| `createdAt` | `created_at` | `OffsetDateTime` | `TIMESTAMPTZ` | NO |

**Enum `PaymentMethod`:** `CASH`, `CREDIT_CARD`, `DEBIT_CARD`, `BANK_TRANSFER`, `CHECK`, `INSURANCE`, `OTHER`

---

## Correcciones Aplicadas

| Entidad | Problema | Correccion |
|---|---|---|
| `Appointment` | `scheduledAt` era `LocalDateTime` | Cambiado a `OffsetDateTime` (columna es `TIMESTAMPTZ`) |
| `Appointment` | Faltaba `scheduledEndAt` | Campo agregado (columna agregada en V4) |
| `Invoice` | `appointment` era `optional=false/nullable=false` | V4 hizo la columna nullable; corregido a `optional=true` |
| `Invoice` | Faltaba campo `notes` | Campo agregado (columna agregada en V4) |
| `MedicalRecord` | `recordDate` era `LocalDateTime` | Cambiado a `OffsetDateTime` |
| `Diagnosis` | `diagnosedAt` era `LocalDateTime` | Cambiado a `OffsetDateTime` |
| `Diagnosis` | Import `LocalDateTime` sin usar | Eliminado |
| `Procedure` | `performedAt` era `LocalDateTime` | Cambiado a `OffsetDateTime` |
| `Procedure` | Import `LocalDateTime` sin usar | Eliminado |
| `Payment` | `paymentDate` era `LocalDateTime` | Cambiado a `OffsetDateTime` |
| `Payment` | Import `LocalDateTime` sin usar | Eliminado |
| `InsurancePolicy` | `deductible` sin `nullable=false` | Corregido (columna es `NOT NULL DEFAULT 0`) |
| `Doctor` | `columnDefinition` innecesario en `isActive` | Eliminado (Flyway gestiona el DDL) |
| — | `CatalogPriceHistory` no existia | Entidad creada (tabla V3) |
| — | `InvoiceSequence` no existia | Entidad creada (tabla V4) |
