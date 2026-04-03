import { useMemo, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/DataTable'
import { INVOICE_STATUS_LABELS } from '@/types/enums'
import {
  useCancelInvoice,
  useConfirmInvoice,
  useInvoices,
  useOverdueInvoice,
} from '../../hooks/useInvoices'
import { getInvoiceColumns } from '../invoiceColumns'

type InvoiceStatusFilter =
  | 'all'
  | 'draft'
  | 'pending'
  | 'partial_paid'
  | 'paid'
  | 'cancelled'
  | 'overdue'

export function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatusFilter>('all')

  const { data: invoices = [], isLoading } = useInvoices({
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  const confirmInvoice = useConfirmInvoice()
  const overdueInvoice = useOverdueInvoice()
  const cancelInvoice = useCancelInvoice()

  const columns = useMemo(
    () =>
      getInvoiceColumns({
        onConfirm: (invoice) => confirmInvoice.mutate(invoice.id),
        onOverdue: (invoice) => overdueInvoice.mutate(invoice.id),
        onCancel: (invoice) => cancelInvoice.mutate(invoice.id),
      }),
    [cancelInvoice, confirmInvoice, overdueInvoice],
  )

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">Facturas</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Control de facturación, cobranza y estado financiero
        </p>
      </div>

      <div className="flex-1 px-6 py-5 overflow-auto">
        <div className="flex items-center mb-4 gap-2 w-full sm:w-auto">
          <span className="text-sm text-slate-600">Estado:</span>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as InvoiceStatusFilter)}
          >
            <SelectTrigger className="h-8 w-full sm:w-52 text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">{INVOICE_STATUS_LABELS.draft}</SelectItem>
              <SelectItem value="pending">{INVOICE_STATUS_LABELS.pending}</SelectItem>
              <SelectItem value="partial_paid">{INVOICE_STATUS_LABELS.partial_paid}</SelectItem>
              <SelectItem value="paid">{INVOICE_STATUS_LABELS.paid}</SelectItem>
              <SelectItem value="cancelled">{INVOICE_STATUS_LABELS.cancelled}</SelectItem>
              <SelectItem value="overdue">{INVOICE_STATUS_LABELS.overdue}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={invoices}
          isLoading={isLoading}
          pageSize={20}
          emptyMessage="No hay facturas para el filtro seleccionado."
        />
      </div>
    </div>
  )
}
