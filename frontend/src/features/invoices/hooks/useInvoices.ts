import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as invoicesApi from '../api/invoicesApi'
import { extractApiErrorMessage } from '@/lib/utils'
import type {
  InvoiceInsurancePolicyRequest,
  InvoiceItemRequest,
  PaymentCreateRequest,
} from '@/types/invoice'

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (params: object = {}) => [...invoiceKeys.all, 'list', params] as const,
  detail: (id: string) => [...invoiceKeys.all, 'detail', id] as const,
  payments: (id: string) => [...invoiceKeys.all, 'payments', id] as const,
}

export function useInvoices(
  params: { status?: string; startDate?: string; endDate?: string; page?: number; size?: number } = {},
) {
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
        startDate: params.startDate,
        endDate: params.endDate,
        page: params.page ?? 0,
        size: params.size ?? 20,
      }),
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
    queryFn: () => invoicesApi.getInvoicePayments(id),
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
    onError: (error) => {
      toast.error(extractApiErrorMessage(error) ?? errorMessage)
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
    onError: (error) => {
      toast.error(extractApiErrorMessage(error) ?? 'Error al registrar el pago')
    },
  })
}

export function useAddInvoiceItem(invoiceId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: InvoiceItemRequest) => invoicesApi.addInvoiceItem(invoiceId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) })
      void qc.invalidateQueries({ queryKey: invoiceKeys.all })
      toast.success('Item agregado')
    },
    onError: (error) => {
      toast.error(extractApiErrorMessage(error) ?? 'Error al agregar el item')
    },
  })
}

export function useRemoveInvoiceItem(invoiceId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (itemId: string) => invoicesApi.removeInvoiceItem(invoiceId, itemId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) })
      void qc.invalidateQueries({ queryKey: invoiceKeys.all })
      toast.success('Item eliminado')
    },
    onError: (error) => {
      toast.error(extractApiErrorMessage(error) ?? 'Error al eliminar el item')
    },
  })
}

export function useAssignInvoiceInsurancePolicy(invoiceId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: InvoiceInsurancePolicyRequest) =>
      invoicesApi.assignInvoiceInsurancePolicy(invoiceId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) })
      void qc.invalidateQueries({ queryKey: invoiceKeys.all })
      toast.success('Cobertura actualizada')
    },
    onError: (error) => {
      toast.error(extractApiErrorMessage(error) ?? 'Error al actualizar la cobertura')
    },
  })
}
