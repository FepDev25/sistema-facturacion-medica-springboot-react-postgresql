export type { PageResponse, ApiError, FieldError } from './common'

export type {
  Gender,
  AppointmentStatus,
  InvoiceStatus,
  Severity,
  ItemType,
  PaymentMethod,
  ServiceCategory,
  MedicationUnit,
  CatalogType,
} from './enums'

export {
  GENDER_LABELS,
  APPOINTMENT_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  SEVERITY_LABELS,
  PAYMENT_METHOD_LABELS,
  SERVICE_CATEGORY_LABELS,
  MEDICATION_UNIT_LABELS,
} from './enums'

export type {
  PatientCreateRequest,
  PatientUpdateRequest,
  PatientResponse,
  PatientSummaryResponse,
} from './patient'

export type {
  DoctorCreateRequest,
  DoctorUpdateRequest,
  DoctorResponse,
  DoctorSummaryResponse,
} from './doctor'

export type {
  InsuranceProviderCreateRequest,
  InsuranceProviderUpdateRequest,
  InsuranceProviderResponse,
  InsuranceProviderSummaryResponse,
  InsurancePolicyCreateRequest,
  InsurancePolicyResponse,
  InsurancePolicySummaryResponse,
} from './insurance'

export type {
  AppointmentCreateRequest,
  AppointmentUpdateRequest,
  AppointmentStatusUpdateRequest,
  AppointmentResponse,
  AppointmentSummaryResponse,
} from './appointment'

export type {
  VitalSigns,
  MedicalRecordCreateRequest,
  MedicalRecordUpdateRequest,
  MedicalRecordResponse,
  DiagnosisCreateRequest,
  DiagnosisResponse,
  PrescriptionCreateRequest,
  PrescriptionResponse,
  ProcedureCreateRequest,
  ProcedureResponse,
} from './medical-record'

export type {
  ServiceCreateRequest,
  ServiceUpdateRequest,
  ServiceResponse,
  ServiceSummaryResponse,
  MedicationCreateRequest,
  MedicationUpdateRequest,
  MedicationResponse,
  MedicationSummaryResponse,
  CatalogPriceHistoryResponse,
} from './catalog'

export type {
  InvoiceItemRequest,
  InvoiceCreateRequest,
  InvoiceStatusUpdateRequest,
  InvoiceResponse,
  InvoiceItemResponse,
  InvoiceSummaryResponse,
  PaymentCreateRequest,
  PaymentResponse,
} from './invoice'
