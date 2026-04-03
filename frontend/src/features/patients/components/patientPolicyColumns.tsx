import type { ColumnDef } from '@tanstack/react-table'
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
  ]
}
