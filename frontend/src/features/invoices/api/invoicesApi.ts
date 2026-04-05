import { z } from 'zod'
import { apiClient } from '@/lib/axios'
import type { PageResponse } from '@/types/common'
import type {
  InvoiceItemRequest,
  InvoiceItemResponse,
  InvoiceInsurancePolicyRequest,
  InvoiceListViewResponse,
  InvoiceResponse,
  PaymentCreateRequest,
  PaymentResponse,
} from '@/types/invoice'

const PAYMENT_METHODS = [
  'cash',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'check',
  'insurance',
  'other',
] as const

const INVOICE_ITEM_TYPES = ['service', 'medication', 'procedure', 'other'] as const

export const PaymentFormSchema = z.object({
  amount: z.number({ message: 'Debe ser un numero' }).positive('Debe ser mayor a 0'),
  paymentMethod: z.enum(PAYMENT_METHODS),
  referenceNumber: z.string().max(100, 'Maximo 100 caracteres').optional(),
  notes: z.string().max(500, 'Maximo 500 caracteres').optional(),
  paymentDate: z.string().min(1, 'Requerido'),
})

export type PaymentFormValues = z.infer<typeof PaymentFormSchema>

export const InvoiceItemFormSchema = z
  .object({
    itemType: z.enum(INVOICE_ITEM_TYPES),
    serviceId: z.string().optional(),
    medicationId: z.string().optional(),
    description: z.string().min(1, 'Requerido').max(255, 'Maximo 255 caracteres'),
    quantity: z.number({ message: 'Debe ser un numero' }).int('Debe ser un entero').min(1),
    unitPrice: z.number({ message: 'Debe ser un numero' }).positive('Debe ser mayor a 0'),
  })
  .superRefine((value, ctx) => {
    if (value.itemType === 'service' && !value.serviceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecciona un servicio',
        path: ['serviceId'],
      })
    }

    if (value.itemType === 'medication' && !value.medicationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecciona un medicamento',
        path: ['medicationId'],
      })
    }
  })

export type InvoiceItemFormValues = z.infer<typeof InvoiceItemFormSchema>

export interface InvoicesListParams {
  patientId?: string
  status?: InvoiceResponse['status']
  startDate?: string
  endDate?: string
  page?: number
  size?: number
  sort?: string
}

interface ApiInvoiceListViewResponse {
  id: string
  patientId: string
  patientFirstName: string
  patientLastName: string
  invoiceNumber: string
  total: number
  patientResponsibility: number
  status: InvoiceListViewResponse['status']
  issueDate: string
  dueDate: string
  createdAt: string | null
}

interface ApiInvoicePatient {
  id: string
  dni: string
  firstName: string
  lastName: string
  allergies: string | null
}

interface ApiInvoiceAppointment {
  id: string
  scheduledAt: string
  status: NonNullable<InvoiceResponse['appointment']>['status']
  chiefComplaint: string | null
}

interface ApiInvoiceInsurancePolicy {
  id: string
  policyNumber: string
  providerName: string
  coveragePercentage: number
}

interface ApiInvoiceService {
  id: string
  code: string
  name: string
  price: number
}

interface ApiInvoiceMedication {
  id: string
  code: string
  name: string
  requiresPrescription: boolean
}

interface ApiInvoiceItemView {
  id: string
  service: ApiInvoiceService | null
  medication: ApiInvoiceMedication | null
  itemType: InvoiceItemResponse['itemType']
  description: string
  quantity: number
  unitPrice: number
  subtotal: number
  createdAt: string | null
}

interface ApiInvoiceViewResponse {
  id: string
  invoiceNumber: string
  patient: ApiInvoicePatient
  appointment: ApiInvoiceAppointment | null
  insurancePolicy: ApiInvoiceInsurancePolicy | null
  subtotal: number
  tax: number
  total: number
  insuranceCoverage: number
  patientResponsibility: number
  status: InvoiceResponse['status']
  issueDate: string
  dueDate: string
  notes: string | null
  items: ApiInvoiceItemView[]
  createdAt: string | null
  updatedAt: string | null
}

interface ApiPaymentResponse {
  id: string
  invoiceId: string
  invoiceNumber: string
  amount: number
  paymentMethod: PaymentResponse['paymentMethod']
  referenceNumber: string | null
  notes: string | null
  paymentDate: string
  createdAt: string | null
}

interface ApiInvoiceInsurancePolicyRequest {
  insurancePolicyId: string | null
}

function toInvoiceSummaryFromView(item: ApiInvoiceViewResponse): PaymentResponse['invoice'] {
  return {
    id: item.id,
    invoiceNumber: item.invoiceNumber,
    total: item.total,
    patientResponsibility: item.patientResponsibility,
    status: item.status,
    dueDate: item.dueDate,
  }
}

function mapInvoiceListItem(item: ApiInvoiceListViewResponse): InvoiceListViewResponse {
  return {
    id: item.id,
    patientId: item.patientId,
    patientFirstName: item.patientFirstName,
    patientLastName: item.patientLastName,
    invoiceNumber: item.invoiceNumber,
    total: item.total,
    patientResponsibility: item.patientResponsibility,
    status: item.status,
    issueDate: item.issueDate,
    dueDate: item.dueDate,
    createdAt: item.createdAt ?? item.issueDate,
  }
}

function mapInvoiceView(item: ApiInvoiceViewResponse): InvoiceResponse {
  return {
    id: item.id,
    invoiceNumber: item.invoiceNumber,
    patient: {
      id: item.patient.id,
      dni: item.patient.dni,
      firstName: item.patient.firstName,
      lastName: item.patient.lastName,
      allergies: item.patient.allergies,
    },
    appointment: item.appointment
      ? {
          id: item.appointment.id,
          scheduledAt: item.appointment.scheduledAt,
          status: item.appointment.status,
          chiefComplaint: item.appointment.chiefComplaint ?? '',
        }
      : null,
    insurancePolicy: item.insurancePolicy
      ? {
          id: item.insurancePolicy.id,
          policyNumber: item.insurancePolicy.policyNumber,
          providerName: item.insurancePolicy.providerName,
          coveragePercentage: item.insurancePolicy.coveragePercentage,
        }
      : null,
    subtotal: item.subtotal,
    tax: item.tax,
    total: item.total,
    insuranceCoverage: item.insuranceCoverage,
    patientResponsibility: item.patientResponsibility,
    status: item.status,
    issueDate: item.issueDate,
    dueDate: item.dueDate,
    notes: item.notes,
    items: item.items.map((invoiceItem) => ({
      id: invoiceItem.id,
      service: invoiceItem.service
        ? {
            id: invoiceItem.service.id,
            code: invoiceItem.service.code,
            name: invoiceItem.service.name,
            price: invoiceItem.service.price,
          }
        : null,
      medication: invoiceItem.medication
        ? {
            id: invoiceItem.medication.id,
            code: invoiceItem.medication.code,
            name: invoiceItem.medication.name,
            requiresPrescription: invoiceItem.medication.requiresPrescription,
          }
        : null,
      itemType: invoiceItem.itemType,
      description: invoiceItem.description,
      quantity: invoiceItem.quantity,
      unitPrice: invoiceItem.unitPrice,
      subtotal: invoiceItem.subtotal,
    })),
    payments: [],
    createdAt: item.createdAt ?? item.issueDate,
    updatedAt: item.updatedAt ?? item.createdAt ?? item.issueDate,
  }
}

function mapPayment(
  item: ApiPaymentResponse,
  invoiceSummary: PaymentResponse['invoice'],
): PaymentResponse {
  return {
    id: item.id,
    invoice: invoiceSummary,
    amount: item.amount,
    paymentMethod: item.paymentMethod,
    referenceNumber: item.referenceNumber,
    notes: item.notes,
    paymentDate: item.paymentDate,
    createdAt: item.createdAt ?? item.paymentDate,
  }
}

export async function getInvoices(
  params: InvoicesListParams = {},
): Promise<PageResponse<InvoiceListViewResponse>> {
  const response = await apiClient.get<PageResponse<ApiInvoiceListViewResponse>>('/invoices/view', {
    params: {
      patientId: params.patientId,
      status: params.status?.toUpperCase(),
      startDate: params.startDate,
      endDate: params.endDate,
      page: params.page ?? 0,
      size: params.size ?? 20,
      sort: params.sort,
    },
  })

  return {
    ...response.data,
    content: response.data.content.map(mapInvoiceListItem),
  }
}

export async function getInvoiceById(id: string): Promise<InvoiceResponse> {
  const response = await apiClient.get<ApiInvoiceViewResponse>(`/invoices/${id}/view`)
  const mapped = mapInvoiceView(response.data)
  const payments = await getPaymentsByInvoice(
    mapped.id,
    { page: 0, size: 200 },
    toInvoiceSummaryFromView(response.data),
  )

  return {
    ...mapped,
    payments: payments.content,
  }
}

async function transitionStatus(
  id: string,
  endpoint: 'confirm' | 'overdue' | 'cancel',
): Promise<InvoiceResponse> {
  await apiClient.patch(`/invoices/${id}/${endpoint}`)
  return getInvoiceById(id)
}

export async function confirmInvoice(id: string): Promise<InvoiceResponse> {
  return transitionStatus(id, 'confirm')
}

export async function markInvoiceOverdue(id: string): Promise<InvoiceResponse> {
  return transitionStatus(id, 'overdue')
}

export async function cancelInvoice(id: string): Promise<InvoiceResponse> {
  return transitionStatus(id, 'cancel')
}

export async function getPaymentsByInvoice(
  invoiceId: string,
  params: { page?: number; size?: number } = {},
  invoiceSummary?: PaymentResponse['invoice'],
): Promise<PageResponse<PaymentResponse>> {
  let summary = invoiceSummary
  if (!summary) {
    const invoice = await getInvoiceById(invoiceId)
    summary = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      patientResponsibility: invoice.patientResponsibility,
      status: invoice.status,
      dueDate: invoice.dueDate,
    }
  }

  const response = await apiClient.get<PageResponse<ApiPaymentResponse>>(
    `/payments/invoice/${invoiceId}`,
    {
      params: {
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    },
  )

  return {
    ...response.data,
    content: response.data.content.map((item) => mapPayment(item, summary)),
  }
}

export async function registerPayment(data: PaymentCreateRequest): Promise<PaymentResponse> {
  const response = await apiClient.post<ApiPaymentResponse>('/payments', data)
  const invoice = await getInvoiceById(response.data.invoiceId)
  const summary: PaymentResponse['invoice'] = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    total: invoice.total,
    patientResponsibility: invoice.patientResponsibility,
    status: invoice.status,
    dueDate: invoice.dueDate,
  }

  return mapPayment(response.data, summary)
}

export async function addInvoiceItem(
  invoiceId: string,
  data: InvoiceItemRequest,
): Promise<InvoiceItemResponse> {
  const response = await apiClient.post<InvoiceItemResponse>(`/invoices/${invoiceId}/items`, data)
  return response.data
}

export async function removeInvoiceItem(invoiceId: string, itemId: string): Promise<void> {
  await apiClient.delete(`/invoices/${invoiceId}/items/${itemId}`)
}

export async function assignInvoiceInsurancePolicy(
  invoiceId: string,
  data: InvoiceInsurancePolicyRequest,
): Promise<InvoiceResponse> {
  const payload: ApiInvoiceInsurancePolicyRequest = {
    insurancePolicyId: data.insurancePolicyId ?? null,
  }

  await apiClient.patch(`/invoices/${invoiceId}/insurance-policy`, payload)
  return getInvoiceById(invoiceId)
}

export function toPaymentCreateRequest(
  invoiceId: string,
  values: PaymentFormValues,
): PaymentCreateRequest {
  return {
    invoiceId,
    amount: values.amount,
    paymentMethod: values.paymentMethod,
    referenceNumber:
      values.referenceNumber && values.referenceNumber.trim().length > 0
        ? values.referenceNumber.trim()
        : null,
    notes: values.notes && values.notes.trim().length > 0 ? values.notes.trim() : null,
    paymentDate: new Date(values.paymentDate).toISOString(),
  }
}

export function toInvoiceItemRequest(values: InvoiceItemFormValues): InvoiceItemRequest {
  return {
    itemType: values.itemType,
    serviceId: values.itemType === 'service' ? (values.serviceId ?? null) : null,
    medicationId: values.itemType === 'medication' ? (values.medicationId ?? null) : null,
    description: values.description.trim(),
    quantity: values.quantity,
    unitPrice: values.unitPrice,
  }
}
