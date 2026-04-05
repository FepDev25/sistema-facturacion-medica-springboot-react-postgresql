import type { ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { InvoiceListViewResponse } from '@/types/invoice'
import { INVOICE_STATUS_LABELS } from '@/types/enums'
import { formatCurrency, formatDate } from '@/lib/utils'

const STATUS_CLASS: Record<string, string> = {
  draft: 'border-slate-200 text-slate-600 bg-slate-50',
  pending: 'border-blue-200 text-blue-700 bg-blue-50',
  partial_paid: 'border-cyan-200 text-cyan-700 bg-cyan-50',
  paid: 'border-green-200 text-green-700 bg-green-50',
  cancelled: 'border-slate-200 text-slate-600 bg-slate-50',
  overdue: 'border-amber-200 text-amber-700 bg-amber-50',
}

export function getPatientInvoiceColumns(): ColumnDef<InvoiceListViewResponse, unknown>[] {
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
      accessorKey: 'status',
      header: 'Estado',
      size: 120,
      cell: ({ row }) => (
        <Badge variant="outline" className={STATUS_CLASS[row.original.status]}>
          {INVOICE_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: 'issueDate',
      header: 'Emision',
      size: 120,
      cell: ({ row }) => <span className="text-sm text-slate-700">{formatDate(row.original.issueDate)}</span>,
    },
    {
      accessorKey: 'dueDate',
      header: 'Vencimiento',
      size: 120,
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
      id: 'actions',
      size: 60,
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-slate-900"
            aria-label="Ver detalle de la factura"
            title="Ver detalle"
          >
            <Link to="/invoices/$id" params={{ id: row.original.id }}>
              <Eye className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      ),
    },
  ]
}
