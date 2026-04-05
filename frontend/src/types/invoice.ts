import type { InvoiceStatus, ItemType, PaymentMethod } from './enums'
import type { PatientSummaryResponse } from './patient'
import type { AppointmentSummaryResponse } from './appointment'
import type { InsurancePolicySummaryResponse } from './insurance'
import type { ServiceSummaryResponse } from './catalog'
import type { MedicationSummaryResponse } from './catalog'

// Invoice Items

export interface InvoiceItemRequest {
  serviceId?: string | null
  medicationId?: string | null
  itemType: ItemType
  description: string
  quantity: number               // >= 1
  unitPrice: number              // >= 0
}

// Invoice

export interface InvoiceStatusUpdateRequest {
  status: InvoiceStatus
}

export interface InvoiceInsurancePolicyRequest {
  insurancePolicyId?: string | null
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
  updatedAt?: string
}

export interface InvoiceListViewResponse {
  id: string
  patientId: string
  patientFirstName: string
  patientLastName: string
  invoiceNumber: string
  total: number
  patientResponsibility: number
  status: InvoiceStatus
  issueDate: string
  dueDate: string
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

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  service: 'Servicio',
  medication: 'Medicamento',
  procedure: 'Procedimiento',
  other: 'Otro',
}
