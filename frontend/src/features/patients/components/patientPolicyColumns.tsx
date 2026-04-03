import type { ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { InsurancePolicySummaryResponse } from '@/types/insurance'

export function getPatientPolicyColumns(): ColumnDef<InsurancePolicySummaryResponse, unknown>[] {
  return [
    {
      accessorKey: 'policyNumber',
      header: 'Póliza',
      size: 180,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
          {row.original.policyNumber}
        </span>
      ),
    },
    {
      accessorKey: 'providerName',
      header: 'Aseguradora',
      cell: ({ row }) => <span className="text-sm text-slate-800">{row.original.providerName}</span>,
    },
    {
      accessorKey: 'coveragePercentage',
      header: () => <div className="text-right">Cobertura</div>,
      size: 120,
      cell: ({ row }) => (
        <div className="text-right text-sm font-medium text-slate-700 tabular-nums">
          {row.original.coveragePercentage}%
        </div>
      ),
    },
    {
      id: 'actions',
      size: 60,
      cell: () => (
        <div className="flex items-center justify-end">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-slate-900"
            aria-label="Ver póliza en seguros"
            title="Ver en seguros"
          >
            <Link to="/insurance">
              <Eye className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      ),
    },
  ]
}
