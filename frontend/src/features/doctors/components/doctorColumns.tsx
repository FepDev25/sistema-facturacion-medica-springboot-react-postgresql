import type { ColumnDef } from '@tanstack/react-table'
import { Eye, Pencil, UserX } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { AvatarInitials } from '@/components/ui/avatar-initials'
import type { DoctorSummaryResponse } from '@/types/doctor'

interface DoctorColumnsOptions {
  onEdit: (doctor: DoctorSummaryResponse) => void
  onDeactivate: (doctor: DoctorSummaryResponse) => void
  canManage: boolean
}

export function getDoctorColumns({
  onEdit,
  onDeactivate,
  canManage,
}: DoctorColumnsOptions): ColumnDef<DoctorSummaryResponse, unknown>[] {
  return [
    {
      id: 'fullName',
      header: 'Nombre completo',
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <AvatarInitials
            firstName={row.original.firstName}
            lastName={row.original.lastName}
          />
          <p className="font-medium text-foreground">
            {row.original.firstName} {row.original.lastName}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'specialty',
      header: 'Especialidad',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.specialty}</span>,
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
            aria-label="Ver detalle del médico"
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
            aria-label="Editar médico"
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
            aria-label="Desactivar médico"
            disabled={!canManage}
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
