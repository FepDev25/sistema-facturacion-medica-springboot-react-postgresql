import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as invoicesApi from '../api/invoicesApi'
import type { PaymentCreateRequest } from '@/types/invoice'

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (params: object = {}) => [...invoiceKeys.all, 'list', params] as const,
  detail: (id: string) => [...invoiceKeys.all, 'detail', id] as const,
  payments: (id: string) => [...invoiceKeys.all, 'payments', id] as const,
}

export function useInvoices(params: { status?: string } = {}) {
  return useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn: () =>
      invoicesApi.getInvoices({
        status: params.status as
          | 'draft'
          | 'pending'
          | 'partial_paid'
          | 'paid'
          | 'cancelled'
          | 'overdue'
          | undefined,
        page: 0,
        size: 100,
      }),
    select: (data) => data.content,
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => invoicesApi.getInvoiceById(id),
    enabled: !!id,
  })
}

export function useInvoicePayments(id: string) {
  return useQuery({
    queryKey: invoiceKeys.payments(id),
    queryFn: () => invoicesApi.getPaymentsByInvoice(id),
    enabled: !!id,
    select: (data) => data.content,
  })
}

function useInvoiceStatusMutation(
  mutationFn: (id: string) => Promise<unknown>,
  successMessage: string,
  errorMessage: string,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: invoiceKeys.all })
      toast.success(successMessage)
    },
    onError: () => {
      toast.error(errorMessage)
    },
  })
}

export function useConfirmInvoice() {
  return useInvoiceStatusMutation(
    invoicesApi.confirmInvoice,
    'Factura confirmada',
    'Error al confirmar la factura',
  )
}

export function useOverdueInvoice() {
  return useInvoiceStatusMutation(
    invoicesApi.markInvoiceOverdue,
    'Factura marcada como vencida',
    'Error al marcar la factura',
  )
}

export function useCancelInvoice() {
  return useInvoiceStatusMutation(
    invoicesApi.cancelInvoice,
    'Factura cancelada',
    'Error al cancelar la factura',
  )
}

export function useRegisterPayment(invoiceId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: PaymentCreateRequest) => invoicesApi.registerPayment(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: invoiceKeys.all })
      void qc.invalidateQueries({ queryKey: invoiceKeys.payments(invoiceId) })
      toast.success('Pago registrado')
    },
    onError: () => {
      toast.error('Error al registrar el pago')
    },
  })
}
