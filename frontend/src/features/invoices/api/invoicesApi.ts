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

interface ApiInvoiceViewResponse {
  id: string
  patientId: string
  patientFirstName: string
  patientLastName: string
  patientDni: string
  patientAllergies: string | null
  appointmentId: string | null
  appointmentScheduledAt: string | null
  appointmentStatus: string | null
  appointmentChiefComplaint: string | null
  insurancePolicyId: string | null
  insurancePolicyPolicyNumber: string | null
  insurancePolicyProviderName: string | null
  insurancePolicyCoveragePercentage: number | null
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

interface ApiInvoiceItemView {
  id: string
  serviceId: string | null
  serviceCode: string | null
  serviceName: string | null
  servicePrice: number | null
  medicationId: string | null
  medicationCode: string | null
  medicationName: string | null
  medicationRequiresPrescription: boolean | null
  itemType: InvoiceItemResponse['itemType']
  description: string
  quantity: number
  unitPrice: number
  subtotal: number
  createdAt: string | null
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
    createdAt: item.createdAt,
  }
}

function mapInvoiceView(item: ApiInvoiceViewResponse): InvoiceResponse {
  return {
    id: item.id,
    patientId: item.patientId,
    patientFirstName: item.patientFirstName,
    patientLastName: item.patientLastName,
    appointmentId: item.appointmentId,
    insurancePolicyId: item.insurancePolicyId,
    invoiceNumber: item.invoiceNumber,
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
      serviceId: invoiceItem.serviceId,
      serviceName: invoiceItem.serviceName,
      medicationId: invoiceItem.medicationId,
      medicationName: invoiceItem.medicationName,
      itemType: invoiceItem.itemType,
      description: invoiceItem.description,
      quantity: invoiceItem.quantity,
      unitPrice: invoiceItem.unitPrice,
      subtotal: invoiceItem.subtotal,
      createdAt: invoiceItem.createdAt,
    })),
    payments: [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

function mapPayment(item: ApiPaymentResponse): PaymentResponse {
  return {
    id: item.id,
    invoiceId: item.invoiceId,
    invoiceNumber: item.invoiceNumber,
    amount: item.amount,
    paymentMethod: item.paymentMethod,
    referenceNumber: item.referenceNumber,
    notes: item.notes,
    paymentDate: item.paymentDate,
    createdAt: item.createdAt,
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
  return mapInvoiceView(response.data)
}

export async function getInvoiceByAppointment(appointmentId: string): Promise<InvoiceResponse | null> {
  try {
    const response = await apiClient.get<ApiInvoiceViewResponse>(`/invoices/appointment/${appointmentId}`)
    return mapInvoiceView(response.data)
  } catch {
    return null
  }
}

export async function getInvoicePayments(
  invoiceId: string,
  params: { page?: number; size?: number } = {},
): Promise<PageResponse<PaymentResponse>> {
  const response = await apiClient.get<PageResponse<ApiPaymentResponse>>(
    `/payments/invoice/${invoiceId}`,
    {
      params: {
        page: params.page ?? 0,
        size: params.size ?? 200,
      },
    },
  )

  return {
    ...response.data,
    content: response.data.content.map(mapPayment),
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

export async function registerPayment(data: PaymentCreateRequest): Promise<PaymentResponse> {
  const response = await apiClient.post<ApiPaymentResponse>('/payments', data)
  return mapPayment(response.data)
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
  await apiClient.patch(`/invoices/${invoiceId}/insurance-policy`, {
    insurancePolicyId: data.insurancePolicyId ?? null,
  })
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
