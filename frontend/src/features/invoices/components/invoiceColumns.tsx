import type { ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { Check, ClockAlert, Eye, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { INVOICE_STATUS_LABELS } from '@/types/enums'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { InvoiceResponse } from '@/types/invoice'

const STATUS_CLASS: Record<string, string> = {
  draft: 'border-slate-200 text-slate-600 bg-slate-50',
  pending: 'border-blue-200 text-blue-700 bg-blue-50',
  partial_paid: 'border-cyan-200 text-cyan-700 bg-cyan-50',
  paid: 'border-green-200 text-green-700 bg-green-50',
  cancelled: 'border-slate-200 text-slate-600 bg-slate-50',
  overdue: 'border-amber-200 text-amber-700 bg-amber-50',
}

interface InvoiceColumnsOptions {
  onConfirm: (invoice: InvoiceResponse) => void
  onOverdue: (invoice: InvoiceResponse) => void
  onCancel: (invoice: InvoiceResponse) => void
}

export function getInvoiceColumns({
  onConfirm,
  onOverdue,
  onCancel,
}: InvoiceColumnsOptions): ColumnDef<InvoiceResponse, unknown>[] {
  return [
    {
      accessorKey: 'invoiceNumber',
      header: 'Factura',
      size: 140,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
          {row.original.invoiceNumber}
        </span>
      ),
    },
    {
      id: 'patient',
      header: 'Paciente',
      cell: ({ row }) => (
        <p className="font-medium text-slate-900">
          {row.original.patient.firstName} {row.original.patient.lastName}
        </p>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      size: 130,
      cell: ({ row }) => (
        <Badge variant="outline" className={STATUS_CLASS[row.original.status]}>
          {INVOICE_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: 'dueDate',
      header: 'Vencimiento',
      size: 130,
      cell: ({ row }) => <span className="text-sm text-slate-700">{formatDate(row.original.dueDate)}</span>,
    },
    {
      accessorKey: 'total',
      header: () => <div className="text-right">Total</div>,
      size: 120,
      cell: ({ row }) => (
        <div className="text-right text-sm font-medium tabular-nums text-slate-800">
          {formatCurrency(row.original.total)}
        </div>
      ),
    },
    {
      accessorKey: 'patientResponsibility',
      header: () => <div className="text-right">Paciente</div>,
      size: 130,
      cell: ({ row }) => (
        <div className="text-right text-sm font-medium tabular-nums text-slate-800">
          {formatCurrency(row.original.patientResponsibility)}
        </div>
      ),
    },
    {
      id: 'actions',
      size: 165,
      cell: ({ row }) => {
        const invoice = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 hover:text-slate-900"
              aria-label="Ver detalle de la factura"
              title="Ver detalle"
            >
              <Link to="/invoices/$id" params={{ id: invoice.id }}>
                <Eye className="h-3.5 w-3.5" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 hover:text-slate-900"
              aria-label="Confirmar factura"
              onClick={() => onConfirm(invoice)}
              disabled={invoice.status !== 'draft'}
              title="Confirmar"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 hover:text-slate-900"
              aria-label="Marcar factura vencida"
              onClick={() => onOverdue(invoice)}
              disabled={
                invoice.status === 'paid' ||
                invoice.status === 'cancelled' ||
                invoice.status === 'overdue'
              }
              title="Marcar vencida"
            >
              <ClockAlert className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 hover:text-slate-900"
              aria-label="Cancelar factura"
              onClick={() => onCancel(invoice)}
              disabled={invoice.status === 'paid' || invoice.status === 'cancelled'}
              title="Cancelar"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      },
    },
  ]
}
