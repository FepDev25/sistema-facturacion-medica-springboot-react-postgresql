import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, PowerOff, Power } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SERVICE_CATEGORY_LABELS } from '@/types/enums'
import { formatCurrency } from '@/lib/utils'
import type { ServiceResponse } from '@/types/catalog'

const CATEGORY_CLASS: Record<string, string> = {
  consultation: 'border-blue-200 text-blue-700 bg-blue-50',
  laboratory: 'border-purple-200 text-purple-700 bg-purple-50',
  imaging: 'border-indigo-200 text-indigo-700 bg-indigo-50',
  surgery: 'border-red-200 text-red-700 bg-red-50',
  therapy: 'border-teal-200 text-teal-700 bg-teal-50',
  emergency: 'border-orange-200 text-orange-700 bg-orange-50',
  other: 'border-slate-200 text-slate-500 bg-slate-50',
}

interface ServiceColumnsOptions {
  onEdit: (service: ServiceResponse) => void
  onToggleActive: (service: ServiceResponse) => void
  canManage: boolean
}

export function getServiceColumns({
  onEdit,
  onToggleActive,
  canManage,
}: ServiceColumnsOptions): ColumnDef<ServiceResponse, unknown>[] {
  return [
    {
      accessorKey: 'code',
      header: 'Código',
      size: 120,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-slate-900">{row.original.name}</p>
          {row.original.description && (
            <p className="text-xs text-slate-400 truncate max-w-sm">
              {row.original.description}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Categoría',
      size: 150,
      cell: ({ row }) => (
        <Badge variant="outline" className={CATEGORY_CLASS[row.original.category]}>
          {SERVICE_CATEGORY_LABELS[row.original.category]}
        </Badge>
      ),
    },
    {
      accessorKey: 'price',
      header: () => <div className="text-right">Precio</div>,
      size: 110,
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums text-slate-800">
          {formatCurrency(row.original.price)}
        </div>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Estado',
      size: 100,
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0">
            Activo
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-slate-400">
            Inactivo
          </Badge>
        ),
    },
    {
      id: 'actions',
      size: 80,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-slate-900"
            disabled={!canManage}
            onClick={() => onEdit(row.original)}
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-slate-900"
            disabled={!canManage}
            onClick={() => onToggleActive(row.original)}
            title={row.original.isActive ? 'Desactivar' : 'Activar'}
          >
            {row.original.isActive ? (
              <PowerOff className="h-3.5 w-3.5" />
            ) : (
              <Power className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      ),
    },
  ]
}
