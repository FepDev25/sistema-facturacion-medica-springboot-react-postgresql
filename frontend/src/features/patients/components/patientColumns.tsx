import type { ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { Eye, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PatientResponse } from '@/types/patient'

interface PatientColumnsOptions {
  onEdit: (patient: PatientResponse) => void
  canEdit: boolean
}

export function getPatientColumns({
  onEdit,
  canEdit,
}: PatientColumnsOptions): ColumnDef<PatientResponse, unknown>[] {
  return [
    {
      accessorKey: 'dni',
      header: 'DNI',
      size: 140,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
          {row.original.dni}
        </span>
      ),
    },
    {
      id: 'fullName',
      header: 'Nombre completo',
      cell: ({ row }) => (
        <p className="font-medium text-slate-900">
          {row.original.firstName} {row.original.lastName}
        </p>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Teléfono',
      size: 180,
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.phone}</span>,
    },
    {
      accessorKey: 'allergies',
      header: 'Alergias',
      cell: ({ row }) =>
        row.original.allergies ? (
          <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">
            {row.original.allergies}
          </Badge>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      id: 'actions',
      size: 100,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-slate-900"
            aria-label="Ver detalle del paciente"
            title="Ver detalle"
          >
            <Link to="/patients/$id" params={{ id: row.original.id }}>
              <Eye className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-slate-900"
            aria-label="Editar paciente"
            disabled={!canEdit}
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
