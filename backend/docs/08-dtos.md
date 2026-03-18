# Tabla de Verdad de DTOs

Catalogo completo de todos los DTOs que deben construirse por entidad. Cada DTO cubre un caso de uso especifico. Usar `record` para todos los DTOs (inmutabilidad y sin boilerplate).

---

## Convencion de Nombres

| Sufijo | Proposito |
|---|---|
| `CreateRequest` | Datos para crear un recurso (POST) |
| `UpdateRequest` | Datos para actualizar un recurso (PUT/PATCH). Solo campos modificables. |
| `Response` | Datos devueltos al cliente en una sola entidad |
| `SummaryResponse` | Version reducida para listas y referencias anidadas |
| `PageResponse` | Envuelve `Page<T>` con metadatos de paginacion |

---

## Patient

### PatientCreateRequest
Usado en `POST /api/v1/patients`

| Campo | Tipo | Validacion |
|---|---|---|
| `dni` | `String` | `@NotBlank`, `@Size(max=20)` |
| `firstName` | `String` | `@NotBlank`, `@Size(max=100)` |
| `lastName` | `String` | `@NotBlank`, `@Size(max=100)` |
| `birthDate` | `LocalDate` | `@NotNull`, `@Past` |
| `gender` | `Gender` | `@NotNull` |
| `phone` | `String` | `@NotBlank`, `@Size(max=20)` |
| `email` | `String` | `@Email`, puede ser null |
| `address` | `String` | opcional |
| `bloodType` | `String` | opcional, validar valores validos en servicio |
| `allergies` | `String` | opcional |

### PatientUpdateRequest
Usado en `PUT /api/v1/patients/{id}`

| Campo | Tipo | Validacion |
|---|---|---|
| `firstName` | `String` | `@NotBlank`, `@Size(max=100)` |
| `lastName` | `String` | `@NotBlank`, `@Size(max=100)` |
| `phone` | `String` | `@NotBlank`, `@Size(max=20)` |
| `email` | `String` | `@Email`, puede ser null |
| `address` | `String` | opcional |
| `allergies` | `String` | opcional |

> El `dni`, `birthDate` y `gender` no se modifican tras el registro.

### PatientResponse
Usado en respuestas individuales y tras creacion/actualizacion

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `dni` | `String` |
| `firstName` | `String` |
| `lastName` | `String` |
| `birthDate` | `LocalDate` |
| `gender` | `Gender` |
| `phone` | `String` |
| `email` | `String` |
| `address` | `String` |
| `bloodType` | `String` |
| `allergies` | `String` |
| `createdAt` | `OffsetDateTime` |
| `updatedAt` | `OffsetDateTime` |

### PatientSummaryResponse
Usado como referencia anidada en `AppointmentResponse`, `InvoiceResponse`, etc.

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `dni` | `String` |
| `firstName` | `String` |
| `lastName` | `String` |
| `allergies` | `String` |

---

## Doctor

### DoctorCreateRequest
Usado en `POST /api/v1/doctors`

| Campo | Tipo | Validacion |
|---|---|---|
| `licenseNumber` | `String` | `@NotBlank`, `@Size(max=50)` |
| `firstName` | `String` | `@NotBlank`, `@Size(max=100)` |
| `lastName` | `String` | `@NotBlank`, `@Size(max=100)` |
| `specialty` | `String` | `@NotBlank`, `@Size(max=100)` |
| `phone` | `String` | `@NotBlank`, `@Size(max=20)` |
| `email` | `String` | `@NotBlank`, `@Email` |

### DoctorUpdateRequest
Usado en `PUT /api/v1/doctors/{id}`

| Campo | Tipo | Validacion |
|---|---|---|
| `firstName` | `String` | `@NotBlank`, `@Size(max=100)` |
| `lastName` | `String` | `@NotBlank`, `@Size(max=100)` |
| `specialty` | `String` | `@NotBlank` |
| `phone` | `String` | `@NotBlank` |
| `email` | `String` | `@NotBlank`, `@Email` |

### DoctorResponse

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `licenseNumber` | `String` |
| `firstName` | `String` |
| `lastName` | `String` |
| `specialty` | `String` |
| `phone` | `String` |
| `email` | `String` |
| `isActive` | `boolean` |
| `createdAt` | `OffsetDateTime` |
| `updatedAt` | `OffsetDateTime` |

### DoctorSummaryResponse
Usado como referencia anidada en `AppointmentResponse`

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `licenseNumber` | `String` |
| `firstName` | `String` |
| `lastName` | `String` |
| `specialty` | `String` |

---

## InsuranceProvider

### InsuranceProviderCreateRequest

| Campo | Tipo | Validacion |
|---|---|---|
| `name` | `String` | `@NotBlank`, `@Size(max=200)` |
| `code` | `String` | `@NotBlank`, `@Size(max=50)` |
| `phone` | `String` | `@NotBlank`, `@Size(max=20)` |
| `email` | `String` | `@Email`, puede ser null |
| `address` | `String` | opcional |

### InsuranceProviderUpdateRequest

| Campo | Tipo | Validacion |
|---|---|---|
| `name` | `String` | `@NotBlank` |
| `phone` | `String` | `@NotBlank` |
| `email` | `String` | `@Email`, puede ser null |
| `address` | `String` | opcional |

### InsuranceProviderResponse

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `name` | `String` |
| `code` | `String` |
| `phone` | `String` |
| `email` | `String` |
| `address` | `String` |
| `isActive` | `boolean` |

### InsuranceProviderSummaryResponse
Usado como referencia en `InsurancePolicyResponse`

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `name` | `String` |
| `code` | `String` |

---

## InsurancePolicy

### InsurancePolicyCreateRequest

| Campo | Tipo | Validacion |
|---|---|---|
| `patientId` | `UUID` | `@NotNull` |
| `providerId` | `UUID` | `@NotNull` |
| `policyNumber` | `String` | `@NotBlank`, `@Size(max=100)` |
| `coveragePercentage` | `BigDecimal` | `@NotNull`, `@DecimalMin("0")`, `@DecimalMax("100")` |
| `deductible` | `BigDecimal` | `@NotNull`, `@PositiveOrZero` |
| `startDate` | `LocalDate` | `@NotNull` |
| `endDate` | `LocalDate` | `@NotNull` |

### InsurancePolicyResponse

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `patient` | `PatientSummaryResponse` |
| `provider` | `InsuranceProviderSummaryResponse` |
| `policyNumber` | `String` |
| `coveragePercentage` | `BigDecimal` |
| `deductible` | `BigDecimal` |
| `startDate` | `LocalDate` |
| `endDate` | `LocalDate` |
| `isActive` | `boolean` |

### InsurancePolicySummaryResponse
Usado como referencia en `InvoiceResponse`

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `policyNumber` | `String` |
| `coveragePercentage` | `BigDecimal` |
| `providerName` | `String` |

---

## Appointment

### AppointmentCreateRequest

| Campo | Tipo | Validacion |
|---|---|---|
| `patientId` | `UUID` | `@NotNull` |
| `doctorId` | `UUID` | `@NotNull` |
| `scheduledAt` | `OffsetDateTime` | `@NotNull`, `@Future` |
| `durationMinutes` | `Integer` | `@NotNull`, `@Min(1)`, `@Max(480)` |
| `chiefComplaint` | `String` | `@NotBlank` |
| `notes` | `String` | opcional |

### AppointmentUpdateRequest
Solo campos que el medico puede modificar antes de la cita

| Campo | Tipo | Validacion |
|---|---|---|
| `scheduledAt` | `OffsetDateTime` | `@NotNull`, `@Future` |
| `durationMinutes` | `Integer` | `@NotNull`, `@Min(1)`, `@Max(480)` |
| `chiefComplaint` | `String` | `@NotBlank` |
| `notes` | `String` | opcional |

### AppointmentStatusUpdateRequest
Usado para cambios de estado via `PATCH /api/v1/appointments/{id}/status`

| Campo | Tipo | Validacion |
|---|---|---|
| `status` | `AppointmentStatus` | `@NotNull` |
| `notes` | `String` | opcional |

### AppointmentResponse

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `patient` | `PatientSummaryResponse` |
| `doctor` | `DoctorSummaryResponse` |
| `scheduledAt` | `OffsetDateTime` |
| `scheduledEndAt` | `OffsetDateTime` |
| `durationMinutes` | `Integer` |
| `status` | `AppointmentStatus` |
| `chiefComplaint` | `String` |
| `notes` | `String` |
| `createdAt` | `OffsetDateTime` |

### AppointmentSummaryResponse
Usado como referencia en `MedicalRecordResponse`, `InvoiceResponse`

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `scheduledAt` | `OffsetDateTime` |
| `status` | `AppointmentStatus` |
| `chiefComplaint` | `String` |

---

## MedicalRecord

### MedicalRecordCreateRequest

| Campo | Tipo | Validacion |
|---|---|---|
| `appointmentId` | `UUID` | `@NotNull` |
| `patientId` | `UUID` | `@NotNull` |
| `vitalSigns` | `Map<String, Object>` | opcional |
| `physicalExam` | `String` | opcional |
| `clinicalNotes` | `String` | `@NotBlank` |
| `recordDate` | `OffsetDateTime` | `@NotNull` |

### MedicalRecordUpdateRequest
El expediente es inmutable en produccion (RN-08). Este DTO se usa solo en desarrollo o correcciones administrativas.

| Campo | Tipo | Validacion |
|---|---|---|
| `vitalSigns` | `Map<String, Object>` | opcional |
| `physicalExam` | `String` | opcional |
| `clinicalNotes` | `String` | `@NotBlank` |

### MedicalRecordResponse

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `patient` | `PatientSummaryResponse` |
| `appointment` | `AppointmentSummaryResponse` |
| `vitalSigns` | `Map<String, Object>` |
| `physicalExam` | `String` |
| `clinicalNotes` | `String` |
| `recordDate` | `OffsetDateTime` |
| `diagnoses` | `List<DiagnosisResponse>` |
| `prescriptions` | `List<PrescriptionResponse>` |
| `procedures` | `List<ProcedureResponse>` |
| `createdAt` | `OffsetDateTime` |

---

## Diagnosis

### DiagnosisCreateRequest

| Campo | Tipo | Validacion |
|---|---|---|
| `appointmentId` | `UUID` | `@NotNull` |
| `medicalRecordId` | `UUID` | `@NotNull` |
| `icd10Code` | `String` | `@NotBlank`, `@Size(max=10)` |
| `description` | `String` | `@NotBlank` |
| `severity` | `Severity` | opcional |
| `diagnosedAt` | `OffsetDateTime` | `@NotNull` |

### DiagnosisResponse

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `icd10Code` | `String` |
| `description` | `String` |
| `severity` | `Severity` |
| `diagnosedAt` | `OffsetDateTime` |

---

## Prescription

### PrescriptionCreateRequest

| Campo | Tipo | Validacion |
|---|---|---|
| `appointmentId` | `UUID` | `@NotNull` |
| `medicalRecordId` | `UUID` | `@NotNull` |
| `medicationId` | `UUID` | `@NotNull` |
| `dosage` | `String` | `@NotBlank` |
| `frequency` | `String` | `@NotBlank` |
| `durationDays` | `Integer` | `@NotNull`, `@Min(1)`, `@Max(365)` |
| `instructions` | `String` | opcional |

### PrescriptionResponse

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `medication` | `MedicationSummaryResponse` |
| `dosage` | `String` |
| `frequency` | `String` |
| `durationDays` | `Integer` |
| `instructions` | `String` |
| `createdAt` | `OffsetDateTime` |

---

## Procedure

### ProcedureCreateRequest

| Campo | Tipo | Validacion |
|---|---|---|
| `appointmentId` | `UUID` | `@NotNull` |
| `medicalRecordId` | `UUID` | `@NotNull` |
| `procedureCode` | `String` | `@NotBlank`, `@Size(max=50)` |
| `description` | `String` | `@NotBlank` |
| `notes` | `String` | opcional |
| `performedAt` | `OffsetDateTime` | `@NotNull` |

### ProcedureResponse

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `procedureCode` | `String` |
| `description` | `String` |
| `notes` | `String` |
| `performedAt` | `OffsetDateTime` |

---

## ServicesCatalog

### ServiceCreateRequest

| Campo | Tipo | Validacion |
|---|---|---|
| `code` | `String` | `@NotBlank`, `@Size(max=50)` |
| `name` | `String` | `@NotBlank`, `@Size(max=200)` |
| `description` | `String` | opcional |
| `price` | `BigDecimal` | `@NotNull`, `@PositiveOrZero` |
| `category` | `Category` | `@NotNull` |

### ServiceUpdateRequest

| Campo | Tipo | Validacion |
|---|---|---|
| `name` | `String` | `@NotBlank` |
| `description` | `String` | opcional |
| `price` | `BigDecimal` | `@NotNull`, `@PositiveOrZero` |
| `category` | `Category` | `@NotNull` |

### ServiceResponse

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `code` | `String` |
| `name` | `String` |
| `description` | `String` |
| `price` | `BigDecimal` |
| `category` | `Category` |
| `isActive` | `boolean` |

### ServiceSummaryResponse
Usado como referencia en `InvoiceItemResponse`

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `code` | `String` |
| `name` | `String` |
| `price` | `BigDecimal` |

---

## MedicationsCatalog

### MedicationCreateRequest

| Campo | Tipo | Validacion |
|---|---|---|
| `code` | `String` | `@NotBlank`, `@Size(max=50)` |
| `name` | `String` | `@NotBlank`, `@Size(max=200)` |
| `description` | `String` | opcional |
| `price` | `BigDecimal` | `@NotNull`, `@PositiveOrZero` |
| `unit` | `Unit` | `@NotNull` |
| `requiresPrescription` | `boolean` | `@NotNull` |

### MedicationUpdateRequest

| Campo | Tipo | Validacion |
|---|---|---|
| `name` | `String` | `@NotBlank` |
| `description` | `String` | opcional |
| `price` | `BigDecimal` | `@NotNull`, `@PositiveOrZero` |
| `unit` | `Unit` | `@NotNull` |
| `requiresPrescription` | `boolean` | `@NotNull` |

### MedicationResponse

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `code` | `String` |
| `name` | `String` |
| `description` | `String` |
| `price` | `BigDecimal` |
| `unit` | `Unit` |
| `requiresPrescription` | `boolean` |
| `isActive` | `boolean` |

### MedicationSummaryResponse
Usado como referencia en `PrescriptionResponse` e `InvoiceItemResponse`

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `code` | `String` |
| `name` | `String` |
| `requiresPrescription` | `boolean` |

---

## Invoice

### InvoiceCreateRequest

| Campo | Tipo | Validacion |
|---|---|---|
| `patientId` | `UUID` | `@NotNull` |
| `appointmentId` | `UUID` | opcional (obligatorio si `notes` es null) |
| `insurancePolicyId` | `UUID` | opcional |
| `items` | `List<InvoiceItemRequest>` | `@NotNull`, `@NotEmpty` |
| `dueDate` | `LocalDate` | `@NotNull` |
| `notes` | `String` | opcional (obligatorio si `appointmentId` es null) |

> El `invoiceNumber`, `subtotal`, `tax`, `total`, `insuranceCoverage` y `patientResponsibility` los calcula el servicio; no se reciben del cliente.

### InvoiceItemRequest
DTO anidado dentro de `InvoiceCreateRequest`

| Campo | Tipo | Validacion |
|---|---|---|
| `serviceId` | `UUID` | opcional |
| `medicationId` | `UUID` | opcional |
| `itemType` | `ItemType` | `@NotNull` |
| `description` | `String` | `@NotBlank` |
| `quantity` | `Integer` | `@NotNull`, `@Positive` |
| `unitPrice` | `BigDecimal` | `@NotNull`, `@PositiveOrZero` |

### InvoiceStatusUpdateRequest
Usado en `PATCH /api/v1/invoices/{id}/status`

| Campo | Tipo | Validacion |
|---|---|---|
| `status` | `InvoiceStatus` | `@NotNull` |

### InvoiceResponse

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `invoiceNumber` | `String` |
| `patient` | `PatientSummaryResponse` |
| `appointment` | `AppointmentSummaryResponse` |
| `insurancePolicy` | `InsurancePolicySummaryResponse` |
| `subtotal` | `BigDecimal` |
| `tax` | `BigDecimal` |
| `total` | `BigDecimal` |
| `insuranceCoverage` | `BigDecimal` |
| `patientResponsibility` | `BigDecimal` |
| `status` | `InvoiceStatus` |
| `issueDate` | `LocalDate` |
| `dueDate` | `LocalDate` |
| `notes` | `String` |
| `items` | `List<InvoiceItemResponse>` |
| `payments` | `List<PaymentResponse>` |
| `createdAt` | `OffsetDateTime` |

### InvoiceItemResponse

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `service` | `ServiceSummaryResponse` |
| `medication` | `MedicationSummaryResponse` |
| `itemType` | `ItemType` |
| `description` | `String` |
| `quantity` | `Integer` |
| `unitPrice` | `BigDecimal` |
| `subtotal` | `BigDecimal` |

### InvoiceSummaryResponse
Usado en listas y como referencia en `PaymentResponse`

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `invoiceNumber` | `String` |
| `total` | `BigDecimal` |
| `patientResponsibility` | `BigDecimal` |
| `status` | `InvoiceStatus` |
| `dueDate` | `LocalDate` |

---

## Payment

### PaymentCreateRequest
Usado en `POST /api/v1/invoices/{id}/payments`

| Campo | Tipo | Validacion |
|---|---|---|
| `amount` | `BigDecimal` | `@NotNull`, `@Positive` |
| `paymentMethod` | `PaymentMethod` | `@NotNull` |
| `referenceNumber` | `String` | opcional |
| `notes` | `String` | opcional |
| `paymentDate` | `OffsetDateTime` | `@NotNull` |

### PaymentResponse

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `invoice` | `InvoiceSummaryResponse` |
| `amount` | `BigDecimal` |
| `paymentMethod` | `PaymentMethod` |
| `referenceNumber` | `String` |
| `notes` | `String` |
| `paymentDate` | `OffsetDateTime` |
| `createdAt` | `OffsetDateTime` |

---

## CatalogPriceHistory

### CatalogPriceHistoryResponse
Solo lectura. Se escribe internamente al actualizar precios en catalogos.

| Campo | Tipo |
|---|---|
| `id` | `UUID` |
| `catalogType` | `CatalogType` |
| `itemCode` | `String` |
| `itemName` | `String` |
| `oldPrice` | `BigDecimal` |
| `newPrice` | `BigDecimal` |
| `changedAt` | `OffsetDateTime` |

---

## Resumen de DTOs por Entidad

| Entidad | Create | Update | StatusUpdate | Response | SummaryResponse |
|---|---|---|---|---|---|
| Patient | SI | SI | — | SI | SI |
| Doctor | SI | SI | — | SI | SI |
| InsuranceProvider | SI | SI | — | SI | SI |
| InsurancePolicy | SI | — | — | SI | SI |
| Appointment | SI | SI | SI | SI | SI |
| MedicalRecord | SI | SI* | — | SI | — |
| Diagnosis | SI | — | — | SI | — |
| Prescription | SI | — | — | SI | — |
| Procedure | SI | — | — | SI | — |
| ServicesCatalog | SI | SI | — | SI | SI |
| MedicationsCatalog | SI | SI | — | SI | SI |
| Invoice | SI | — | SI | SI | SI |
| InvoiceItem | (anidado en Invoice) | — | — | SI | — |
| Payment | SI | — | — | SI | — |
| CatalogPriceHistory | — | — | — | SI | — |

*`MedicalRecordUpdateRequest` para uso administrativo unicamente.
