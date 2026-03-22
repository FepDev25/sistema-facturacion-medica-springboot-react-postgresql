import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, PowerOff, Power } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MEDICATION_UNIT_LABELS } from '@/types/enums'
import { formatCurrency } from '@/lib/utils'
import type { MedicationResponse } from '@/types/catalog'

interface MedicationColumnsOptions {
  onEdit: (medication: MedicationResponse) => void
  onToggleActive: (medication: MedicationResponse) => void
}

export function getMedicationColumns({
  onEdit,
  onToggleActive,
}: MedicationColumnsOptions): ColumnDef<MedicationResponse, unknown>[] {
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
      accessorKey: 'unit',
      header: 'Unidad',
      size: 110,
      cell: ({ row }) => (
        <span className="text-sm text-slate-600">
          {MEDICATION_UNIT_LABELS[row.original.unit]}
        </span>
      ),
    },
    {
      accessorKey: 'requiresPrescription',
      header: 'Receta',
      size: 90,
      cell: ({ row }) =>
        row.original.requiresPrescription ? (
          <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">
            Requerida
          </Badge>
        ) : (
          <span className="text-xs text-slate-400">—</span>
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
            onClick={() => onEdit(row.original)}
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-slate-900"
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
