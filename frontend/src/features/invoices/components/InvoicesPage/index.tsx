import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/DataTable'
import {
  NO_PERMISSION_MESSAGE,
  useRolePermissions,
} from '@/features/auth/hooks/useRolePermissions'
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
  const { canManageInvoices } = useRolePermissions()

  const [statusFilter, setStatusFilter] = useState<InvoiceStatusFilter>('all')
  const [page, setPage] = useState(0)
  const pageSize = 20

  const { data: invoicesPage, isLoading } = useInvoices({
    status: statusFilter === 'all' ? undefined : statusFilter,
    page,
    size: pageSize,
  })
  const invoices = invoicesPage?.content ?? []

  const confirmInvoice = useConfirmInvoice()
  const overdueInvoice = useOverdueInvoice()
  const cancelInvoice = useCancelInvoice()

  const columns = useMemo(
    () =>
      getInvoiceColumns({
        onConfirm: (invoice) => {
          if (!canManageInvoices) {
            toast.error(NO_PERMISSION_MESSAGE)
            return
          }
          confirmInvoice.mutate(invoice.id)
        },
        onOverdue: (invoice) => {
          if (!canManageInvoices) {
            toast.error(NO_PERMISSION_MESSAGE)
            return
          }
          overdueInvoice.mutate(invoice.id)
        },
        onCancel: (invoice) => {
          if (!canManageInvoices) {
            toast.error(NO_PERMISSION_MESSAGE)
            return
          }
          cancelInvoice.mutate(invoice.id)
        },
        canManage: canManageInvoices,
      }),
    [cancelInvoice, canManageInvoices, confirmInvoice, overdueInvoice],
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
            onValueChange={(value) => {
              setStatusFilter(value as InvoiceStatusFilter)
              setPage(0)
            }}
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

        {!isLoading && invoicesPage && invoicesPage.totalPages > 1 ? (
          <div className="mt-3 flex items-center justify-between px-1">
            <p className="text-xs text-slate-500">
              Pagina {invoicesPage.number + 1} de {invoicesPage.totalPages} -{' '}
              {invoicesPage.totalElements} facturas
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                aria-label="Pagina anterior"
                onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                disabled={invoicesPage.number <= 0}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                aria-label="Pagina siguiente"
                onClick={() =>
                  setPage((prev) =>
                    invoicesPage.number + 1 >= invoicesPage.totalPages ? prev : prev + 1,
                  )
                }
                disabled={invoicesPage.number + 1 >= invoicesPage.totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
