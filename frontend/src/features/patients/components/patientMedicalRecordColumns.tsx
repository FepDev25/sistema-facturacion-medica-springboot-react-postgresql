import type { ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { MedicalRecordResponse } from '@/types/medical-record'
import { formatDateTime } from '@/lib/utils'

export function getPatientMedicalRecordColumns(): ColumnDef<MedicalRecordResponse, unknown>[] {
  return [
    {
      accessorKey: 'recordDate',
      header: 'Fecha de registro',
      size: 180,
      cell: ({ row }) => <span className="text-sm text-slate-700">{formatDateTime(row.original.recordDate)}</span>,
    },
    {
      accessorKey: 'clinicalNotes',
      header: 'Notas clínicas',
      cell: ({ row }) => (
        <span className="text-sm text-slate-700 line-clamp-2">{row.original.clinicalNotes}</span>
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
            aria-label="Ver detalle del expediente"
            title="Ver detalle"
          >
            <Link to="/medical-records/$id" params={{ id: row.original.id }}>
              <Eye className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      ),
    },
  ]
}
