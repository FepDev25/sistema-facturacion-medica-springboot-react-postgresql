import type { ColumnDef } from '@tanstack/react-table'
import { Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { InsurancePolicyResponse } from '@/types/insurance'

interface PolicyColumnsOptions {
  onEdit: (policy: InsurancePolicyResponse) => void
}

export function getPolicyColumns({
  onEdit,
}: PolicyColumnsOptions): ColumnDef<InsurancePolicyResponse, unknown>[] {
  return [
    {
      accessorKey: 'policyNumber',
      header: 'Poliza',
      size: 150,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
          {row.original.policyNumber}
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
      id: 'provider',
      header: 'Aseguradora',
      cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.provider.name}</span>,
    },
    {
      accessorKey: 'coveragePercentage',
      header: () => <div className="text-right">Cobertura</div>,
      size: 110,
      cell: ({ row }) => (
        <div className="text-right text-sm font-medium tabular-nums text-slate-800">
          {row.original.coveragePercentage}%
        </div>
      ),
    },
    {
      accessorKey: 'deductible',
      header: () => <div className="text-right">Deducible</div>,
      size: 120,
      cell: ({ row }) => (
        <div className="text-right text-sm font-medium tabular-nums text-slate-800">
          {formatCurrency(row.original.deductible)}
        </div>
      ),
    },
    {
      id: 'validity',
      header: 'Vigencia',
      size: 170,
      cell: ({ row }) => (
        <span className="text-xs text-slate-600">
          {formatDate(row.original.startDate)} - {formatDate(row.original.endDate)}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Estado',
      size: 100,
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0">Activa</Badge>
        ) : (
          <Badge variant="secondary" className="text-slate-400">
            Inactiva
          </Badge>
        ),
    },
    {
      id: 'actions',
      size: 60,
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-slate-900"
            aria-label="Editar póliza"
            onClick={() => onEdit(row.original)}
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]
}
