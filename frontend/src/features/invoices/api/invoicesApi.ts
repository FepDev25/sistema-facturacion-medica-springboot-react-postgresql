import { z } from 'zod'
import { mockDelay, paginateArray } from '@/lib/mock-utils'
import { INVOICES_MOCK, PAYMENTS_MOCK } from '@/mocks'
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

let invoicesStore: InvoiceResponse[] = [...INVOICES_MOCK]
let paymentsStore: PaymentResponse[] = [...PAYMENTS_MOCK]

export interface InvoicesListParams {
  patientId?: string
  status?: InvoiceResponse['status']
  startDate?: string
  endDate?: string
  page?: number
  size?: number
  sort?: string
}

function syncInvoicePayments(invoiceId: string): void {
  const invoice = invoicesStore.find((item) => item.id === invoiceId)
  if (!invoice) {
    return
  }

  const invoicePayments = paymentsStore
    .filter((payment) => payment.invoice.id === invoiceId)
    .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime())

  const paid = invoicePayments.reduce((acc, item) => acc + item.amount, 0)

  let nextStatus: InvoiceResponse['status'] = invoice.status
  if (invoice.status !== 'cancelled' && invoice.status !== 'draft') {
    if (paid <= 0) {
      nextStatus = 'pending'
    } else if (paid >= invoice.patientResponsibility) {
      nextStatus = 'paid'
    } else {
      nextStatus = 'partial_paid'
    }
  }

  const updated: InvoiceResponse = {
    ...invoice,
    status: nextStatus,
    payments: invoicePayments,
  }

  invoicesStore = invoicesStore.map((item) => (item.id === invoiceId ? updated : item))
}

export async function getInvoices(
  params: InvoicesListParams = {},
): Promise<PageResponse<InvoiceResponse>> {
  await mockDelay()

  const { patientId, status, startDate, endDate, page = 0, size = 20 } = params

  let items = [...invoicesStore]
  if (patientId) {
    items = items.filter((invoice) => invoice.patient.id === patientId)
  }
  if (status) {
    items = items.filter((invoice) => invoice.status === status)
  }
  if (startDate) {
    items = items.filter((invoice) => invoice.issueDate >= startDate)
  }
  if (endDate) {
    items = items.filter((invoice) => invoice.issueDate <= endDate)
  }

  items.sort((a, b) => b.issueDate.localeCompare(a.issueDate))

  return paginateArray(items, page, size)
}

export async function getInvoiceById(id: string): Promise<InvoiceResponse> {
  await mockDelay()

  const invoice = invoicesStore.find((item) => item.id === id)
  if (!invoice) {
    throw new Error('Factura no encontrada')
  }

  return invoice
}

export async function confirmInvoice(id: string): Promise<InvoiceResponse> {
  await mockDelay()

  const existing = invoicesStore.find((item) => item.id === id)
  if (!existing) {
    throw new Error('Factura no encontrada')
  }

  const updated: InvoiceResponse = {
    ...existing,
    status: existing.status === 'draft' ? 'pending' : existing.status,
  }

  invoicesStore = invoicesStore.map((item) => (item.id === id ? updated : item))
  return updated
}

export async function markInvoiceOverdue(id: string): Promise<InvoiceResponse> {
  await mockDelay()

  const existing = invoicesStore.find((item) => item.id === id)
  if (!existing) {
    throw new Error('Factura no encontrada')
  }

  const updated: InvoiceResponse = {
    ...existing,
    status: existing.status === 'paid' || existing.status === 'cancelled' ? existing.status : 'overdue',
  }

  invoicesStore = invoicesStore.map((item) => (item.id === id ? updated : item))
  return updated
}

export async function cancelInvoice(id: string): Promise<InvoiceResponse> {
  await mockDelay()

  const existing = invoicesStore.find((item) => item.id === id)
  if (!existing) {
    throw new Error('Factura no encontrada')
  }

  const updated: InvoiceResponse = {
    ...existing,
    status: 'cancelled',
  }

  invoicesStore = invoicesStore.map((item) => (item.id === id ? updated : item))
  return updated
}

export async function getPaymentsByInvoice(
  invoiceId: string,
  params: { page?: number; size?: number } = {},
): Promise<PageResponse<PaymentResponse>> {
  await mockDelay()

  const { page = 0, size = 20 } = params
  const items = paymentsStore
    .filter((payment) => payment.invoice.id === invoiceId)
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())

  return paginateArray(items, page, size)
}

export async function registerPayment(
  invoiceId: string,
  data: PaymentCreateRequest,
): Promise<PaymentResponse> {
  await mockDelay()

  const invoice = invoicesStore.find((item) => item.id === invoiceId)
  if (!invoice) {
    throw new Error('Factura no encontrada')
  }

  const nextPayment: PaymentResponse = {
    id: crypto.randomUUID(),
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      patientResponsibility: invoice.patientResponsibility,
      status: invoice.status,
      dueDate: invoice.dueDate,
    },
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    referenceNumber: data.referenceNumber ?? null,
    notes: data.notes ?? null,
    paymentDate: data.paymentDate,
    createdAt: new Date().toISOString(),
  }

  paymentsStore = [nextPayment, ...paymentsStore]
  syncInvoicePayments(invoiceId)

  return nextPayment
}

export function toPaymentCreateRequest(values: PaymentFormValues): PaymentCreateRequest {
  return {
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
