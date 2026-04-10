import type { InvoiceStatus, ItemType, PaymentMethod } from './enums'
import type { ServiceSummaryResponse } from './catalog'
import type { MedicationSummaryResponse } from './catalog'

// Invoice Items

export interface InvoiceItemRequest {
  serviceId?: string | null
  medicationId?: string | null
  itemType: ItemType
  description: string
  quantity: number               // >= 1
  unitPrice: number              // > 0
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
  patientId: string
  patientFirstName: string
  patientLastName: string
  appointmentId: string | null
  insurancePolicyId: string | null
  invoiceNumber: string
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
  createdAt: string | null
  updatedAt: string | null
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
  createdAt: string | null
}

export interface InvoiceItemResponse {
  id: string
  serviceId: string | null
  serviceName: string | null
  medicationId: string | null
  medicationName: string | null
  itemType: ItemType
  description: string
  quantity: number
  unitPrice: number
  subtotal: number
  createdAt: string | null
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
  invoiceId: string
  invoiceNumber: string
  amount: number
  paymentMethod: PaymentMethod
  referenceNumber: string | null
  notes: string | null
  paymentDate: string
  createdAt: string | null
}

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  service: 'Servicio',
  medication: 'Medicamento',
  procedure: 'Procedimiento',
  other: 'Otro',
}
