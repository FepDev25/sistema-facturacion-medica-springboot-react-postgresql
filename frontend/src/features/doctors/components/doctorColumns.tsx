import type { ColumnDef } from '@tanstack/react-table'
import { Eye, Pencil, UserX } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { DoctorResponse } from '@/types/doctor'

interface DoctorColumnsOptions {
  onEdit: (doctor: DoctorResponse) => void
  onDeactivate: (doctor: DoctorResponse) => void
}

export function getDoctorColumns({
  onEdit,
  onDeactivate,
}: DoctorColumnsOptions): ColumnDef<DoctorResponse, unknown>[] {
  return [
    {
      accessorKey: 'licenseNumber',
      header: 'Licencia',
      size: 160,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
          {row.original.licenseNumber}
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
      accessorKey: 'specialty',
      header: 'Especialidad',
      cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.specialty}</span>,
    },
    {
      accessorKey: 'phone',
      header: 'Teléfono',
      size: 170,
      cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.phone}</span>,
    },
    {
      accessorKey: 'isActive',
      header: 'Estado',
      size: 110,
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
      size: 110,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-slate-900"
            title="Ver detalle"
          >
            <Link to="/doctors/$id" params={{ id: row.original.id }}>
              <Eye className="h-3.5 w-3.5" />
            </Link>
          </Button>
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
            disabled={!row.original.isActive}
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
