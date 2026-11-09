import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, PowerOff, Power } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SERVICE_CATEGORY_LABELS } from '@/types/enums'
import { formatCurrency } from '@/lib/utils'
import type { ServiceResponse } from '@/types/catalog'

const CATEGORY_CLASS: Record<string, string> = {
  consultation: 'border-info/25 text-info bg-info/10',
  laboratory: 'border-primary/25 text-primary bg-primary/10',
  imaging: 'border-primary/25 text-primary bg-primary/10',
  surgery: 'border-destructive/25 text-destructive bg-destructive/10',
  therapy: 'border-primary/25 text-primary bg-primary/10',
  emergency: 'border-warning/25 text-warning bg-warning/10',
  other: 'border-border text-muted-foreground bg-muted/50',
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
        <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">{row.original.name}</p>
          {row.original.description && (
            <p className="text-xs text-muted-foreground/70 truncate max-w-sm">
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
        <div className="text-right font-medium tabular-nums text-foreground">
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
          <Badge className="bg-success/15 text-success hover:bg-success/15 border-0">Activo</Badge>
        ) : (
          <Badge variant="secondary" className="text-muted-foreground/70">
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
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            disabled={!canManage}
            onClick={() => onEdit(row.original)}
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
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
