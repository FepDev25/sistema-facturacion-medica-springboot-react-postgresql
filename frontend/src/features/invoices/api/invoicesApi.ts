import { z } from 'zod'
import { apiClient } from '@/lib/axios'
import type { PageResponse } from '@/types/common'
import type {
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

export const PaymentFormSchema = z.object({
  amount: z.number({ message: 'Debe ser un numero' }).positive('Debe ser mayor a 0'),
  paymentMethod: z.enum(PAYMENT_METHODS),
  referenceNumber: z.string().max(100, 'Maximo 100 caracteres').optional(),
  notes: z.string().max(500, 'Maximo 500 caracteres').optional(),
  paymentDate: z.string().min(1, 'Requerido'),
})

export type PaymentFormValues = z.infer<typeof PaymentFormSchema>

export interface InvoicesListParams {
  patientId?: string
  status?: InvoiceResponse['status']
  startDate?: string
  endDate?: string
  page?: number
  size?: number
  sort?: string
}

interface ApiInvoiceItem {
  id: string
  serviceId: string | null
  serviceName: string | null
  medicationId: string | null
  medicationName: string | null
  itemType: 'service' | 'medication' | 'procedure' | 'other'
  description: string
  quantity: number
  unitPrice: number
  subtotal: number
}

interface ApiInvoiceResponse {
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
  status: InvoiceResponse['status']
  issueDate: string
  dueDate: string
  notes: string | null
  items: ApiInvoiceItem[]
  createdAt: string | null
}

interface ApiPatientDetail {
  id: string
  dni: string
  firstName: string
  lastName: string
  allergies: string | null
}

interface ApiAppointmentDetail {
  id: string
  scheduledAt: string
  status: InvoiceResponse['appointment'] extends null
    ? never
    : NonNullable<InvoiceResponse['appointment']>['status']
  chiefComplaint: string | null
}

interface ApiInsurancePolicyDetail {
  id: string
  policyNumber: string
  providerName: string
  coveragePercentage: number
}

interface ApiServiceDetail {
  id: string
  code: string
  name: string
  price: number
}

interface ApiMedicationDetail {
  id: string
  code: string
  name: string
  requiresPrescription: boolean
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

function toInvoiceSummary(item: ApiInvoiceResponse): PaymentResponse['invoice'] {
  return {
    id: item.id,
    invoiceNumber: item.invoiceNumber,
    total: item.total,
    patientResponsibility: item.patientResponsibility,
    status: item.status,
    dueDate: item.dueDate,
  }
}

async function enrichInvoice(item: ApiInvoiceResponse): Promise<InvoiceResponse> {
  const [patientResponse, appointmentResponse, policyResponse] = await Promise.all([
    apiClient.get<ApiPatientDetail>(`/patients/${item.patientId}`),
    item.appointmentId
      ? apiClient.get<ApiAppointmentDetail>(`/appointments/${item.appointmentId}`)
      : Promise.resolve(null),
    item.insurancePolicyId
      ? apiClient.get<ApiInsurancePolicyDetail>(`/insurance/policies/${item.insurancePolicyId}`)
      : Promise.resolve(null),
  ])

  const serviceIds = Array.from(
    new Set(item.items.map((invoiceItem) => invoiceItem.serviceId).filter(Boolean) as string[]),
  )
  const medicationIds = Array.from(
    new Set(item.items.map((invoiceItem) => invoiceItem.medicationId).filter(Boolean) as string[]),
  )

  const [services, medications] = await Promise.all([
    Promise.all(
      serviceIds.map(async (serviceId) => {
        const response = await apiClient.get<ApiServiceDetail>(`/catalog/services/${serviceId}`)
        return [serviceId, response.data] as const
      }),
    ),
    Promise.all(
      medicationIds.map(async (medicationId) => {
        const response = await apiClient.get<ApiMedicationDetail>(
          `/catalog/medications/${medicationId}`,
        )
        return [medicationId, response.data] as const
      }),
    ),
  ])

  const servicesById = new Map(services)
  const medicationsById = new Map(medications)

  return {
    id: item.id,
    invoiceNumber: item.invoiceNumber,
    patient: {
      id: patientResponse.data.id,
      dni: patientResponse.data.dni,
      firstName: patientResponse.data.firstName,
      lastName: patientResponse.data.lastName,
      allergies: patientResponse.data.allergies,
    },
    appointment: appointmentResponse
      ? {
          id: appointmentResponse.data.id,
          scheduledAt: appointmentResponse.data.scheduledAt,
          status: appointmentResponse.data.status,
          chiefComplaint: appointmentResponse.data.chiefComplaint ?? '',
        }
      : null,
    insurancePolicy: policyResponse
      ? {
          id: policyResponse.data.id,
          policyNumber: policyResponse.data.policyNumber,
          providerName: policyResponse.data.providerName,
          coveragePercentage: policyResponse.data.coveragePercentage,
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
    items: item.items.map((invoiceItem) => {
      const service = invoiceItem.serviceId ? servicesById.get(invoiceItem.serviceId) : null
      const medication = invoiceItem.medicationId
        ? medicationsById.get(invoiceItem.medicationId)
        : null

      return {
        id: invoiceItem.id,
        service: service
          ? {
              id: service.id,
              code: service.code,
              name: service.name,
              price: service.price,
            }
          : null,
        medication: medication
          ? {
              id: medication.id,
              code: medication.code,
              name: medication.name,
              requiresPrescription: medication.requiresPrescription,
            }
          : null,
        itemType: invoiceItem.itemType,
        description: invoiceItem.description,
        quantity: invoiceItem.quantity,
        unitPrice: invoiceItem.unitPrice,
        subtotal: invoiceItem.subtotal,
      }
    }),
    payments: [],
    createdAt: item.createdAt ?? item.issueDate,
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

async function getInvoiceRawById(id: string): Promise<ApiInvoiceResponse> {
  const response = await apiClient.get<ApiInvoiceResponse>(`/invoices/${id}`)
  return response.data
}

export async function getInvoices(
  params: InvoicesListParams = {},
): Promise<PageResponse<InvoiceResponse>> {
  const response = await apiClient.get<PageResponse<ApiInvoiceResponse>>('/invoices', {
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
    content: await Promise.all(response.data.content.map((item) => enrichInvoice(item))),
  }
}

export async function getInvoiceById(id: string): Promise<InvoiceResponse> {
  const rawInvoice = await getInvoiceRawById(id)
  const mapped = await enrichInvoice(rawInvoice)
  const payments = await getPaymentsByInvoice(
    mapped.id,
    { page: 0, size: 200 },
    toInvoiceSummary(rawInvoice),
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
  const response = await apiClient.patch<ApiInvoiceResponse>(`/invoices/${id}/${endpoint}`)
  return enrichInvoice(response.data)
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
  const summary = invoiceSummary ?? toInvoiceSummary(await getInvoiceRawById(invoiceId))

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
  const summary = toInvoiceSummary(await getInvoiceRawById(response.data.invoiceId))
  return mapPayment(response.data, summary)
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
