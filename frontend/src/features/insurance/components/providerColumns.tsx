import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, UserX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { InsuranceProviderResponse } from '@/types/insurance'

interface ProviderColumnsOptions {
  onEdit: (provider: InsuranceProviderResponse) => void
  onDeactivate: (provider: InsuranceProviderResponse) => void
  canManage: boolean
}

export function getProviderColumns({
  onEdit,
  onDeactivate,
  canManage,
}: ProviderColumnsOptions): ColumnDef<InsuranceProviderResponse, unknown>[] {
  return [
    {
      accessorKey: 'code',
      header: 'Codigo',
      size: 120,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Aseguradora',
      cell: ({ row }) => <p className="font-medium text-slate-900">{row.original.name}</p>,
    },
    {
      accessorKey: 'phone',
      header: 'Telefono',
      size: 160,
      cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.phone}</span>,
    },
    {
      accessorKey: 'isActive',
      header: 'Estado',
      size: 100,
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0">Activo</Badge>
        ) : (
          <Badge variant="secondary" className="text-slate-400">
            Inactivo
          </Badge>
        ),
    },
    {
      id: 'actions',
      size: 90,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-slate-900"
            aria-label="Editar aseguradora"
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
            aria-label="Desactivar aseguradora"
            disabled={!canManage || !row.original.isActive}
            onClick={() => onDeactivate(row.original)}
            title="Desactivar"
          >
            <UserX className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]
}
