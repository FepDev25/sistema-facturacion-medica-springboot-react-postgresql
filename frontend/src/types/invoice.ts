import type { InvoiceStatus, ItemType, PaymentMethod } from './enums'
import type { PatientSummaryResponse } from './patient'
import type { AppointmentSummaryResponse } from './appointment'
import type { InsurancePolicySummaryResponse } from './insurance'
import type { ServiceSummaryResponse } from './catalog'
import type { MedicationSummaryResponse } from './catalog'

// Invoice Items

// Nested inside InvoiceCreateRequest
export interface InvoiceItemRequest {
  serviceId?: string | null
  medicationId?: string | null
  itemType: ItemType
  description: string
  quantity: number               // >= 1
  unitPrice: number              // >= 0
}

// Invoice

// invoiceNumber, subtotal, tax, total, insuranceCoverage, patientResponsibility
// are computed server-side — not sent by the client
export interface InvoiceCreateRequest {
  patientId: string
  appointmentId?: string | null  // required if notes is null (RN)
  insurancePolicyId?: string | null
  items: InvoiceItemRequest[]
  dueDate: string                // LocalDate → "YYYY-MM-DD"
  notes?: string | null          // required if appointmentId is null (RN)
}

export interface InvoiceStatusUpdateRequest {
  status: InvoiceStatus
}

export interface InvoiceResponse {
  id: string
  invoiceNumber: string
  patient: PatientSummaryResponse
  appointment: AppointmentSummaryResponse | null
  insurancePolicy: InsurancePolicySummaryResponse | null
  subtotal: number
  tax: number
  total: number
  insuranceCoverage: number
  patientResponsibility: number
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  notes: string | null
  items: InvoiceItemResponse[]
  payments: PaymentResponse[]
  createdAt: string
}

export interface InvoiceItemResponse {
  id: string
  service: ServiceSummaryResponse | null
  medication: MedicationSummaryResponse | null
  itemType: ItemType
  description: string
  quantity: number
  unitPrice: number
  subtotal: number
}

// Used in lists and embedded in PaymentResponse
export interface InvoiceSummaryResponse {
  id: string
  invoiceNumber: string
  total: number
  patientResponsibility: number
  status: InvoiceStatus
  dueDate: string
}

// Payment

export interface PaymentCreateRequest {
  invoiceId: string
  amount: number                 // > 0
  paymentMethod: PaymentMethod
  referenceNumber?: string | null
  notes?: string | null
  paymentDate: string            // OffsetDateTime → ISO string
}

export interface PaymentResponse {
  id: string
  invoice: InvoiceSummaryResponse
  amount: number
  paymentMethod: PaymentMethod
  referenceNumber: string | null
  notes: string | null
  paymentDate: string
  createdAt: string
}
