import type { ColumnDef } from '@tanstack/react-table'
import { Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { InsurancePolicyResponse } from '@/types/insurance'

interface PolicyColumnsOptions {
  onEdit: (policy: InsurancePolicyResponse) => void
  canManage: boolean
}

export function getPolicyColumns({
  onEdit,
  canManage,
}: PolicyColumnsOptions): ColumnDef<InsurancePolicyResponse, unknown>[] {
  return [
    {
      accessorKey: 'policyNumber',
      header: 'Poliza',
      size: 150,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          {row.original.policyNumber}
        </span>
      ),
    },
    {
      id: 'patient',
      header: 'Paciente',
      cell: ({ row }) => (
        <p className="font-medium text-foreground">
          {row.original.patientFirstName} {row.original.patientLastName}
        </p>
      ),
    },
    {
      id: 'provider',
      header: 'Aseguradora',
      cell: ({ row }) => (
        <span className="text-sm text-foreground">{row.original.providerName}</span>
      ),
    },
    {
      accessorKey: 'coveragePercentage',
      header: () => <div className="text-right">Cobertura</div>,
      size: 110,
      cell: ({ row }) => (
        <div className="text-right text-sm font-medium tabular-nums text-foreground">
          {row.original.coveragePercentage}%
        </div>
      ),
    },
    {
      accessorKey: 'deductible',
      header: () => <div className="text-right">Deducible</div>,
      size: 120,
      cell: ({ row }) => (
        <div className="text-right text-sm font-medium tabular-nums text-foreground">
          {formatCurrency(row.original.deductible)}
        </div>
      ),
    },
    {
      id: 'validity',
      header: 'Vigencia',
      size: 170,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
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
          <Badge className="bg-success/15 text-success hover:bg-success/15 border-0">Activa</Badge>
        ) : (
          <Badge variant="secondary" className="text-muted-foreground/70">
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
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label="Editar póliza"
            disabled={!canManage}
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
