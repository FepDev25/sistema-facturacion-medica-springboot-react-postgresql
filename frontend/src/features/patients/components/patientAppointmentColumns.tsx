import type { ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { APPOINTMENT_STATUS_LABELS } from '@/types/enums'
import type { AppointmentSummaryResponse } from '@/types/appointment'
import { formatDateTime } from '@/lib/utils'

export function getPatientAppointmentColumns(): ColumnDef<AppointmentSummaryResponse, unknown>[] {
  return [
    {
      accessorKey: 'scheduledAt',
      header: 'Fecha y hora',
      size: 180,
      cell: ({ row }) => (
        <span className="text-sm text-slate-700">{formatDateTime(row.original.scheduledAt)}</span>
      ),
    },
    {
      id: 'patient',
      header: 'Paciente',
      cell: ({ row }) => (
        <p className="font-medium text-slate-900">
          {row.original.patientFirstName} {row.original.patientLastName}
        </p>
      ),
    },
    {
      id: 'doctor',
      header: 'Médico',
      cell: ({ row }) => (
        <p className="text-sm text-slate-700">
          Dr. {row.original.doctorFirstName} {row.original.doctorLastName}
        </p>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      size: 130,
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.status}
          label={APPOINTMENT_STATUS_LABELS[row.original.status]}
        />
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
            aria-label="Ver detalle de la cita"
            title="Ver detalle"
          >
            <Link to="/appointments/$id" params={{ id: row.original.id }}>
              <Eye className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      ),
    },
  ]
}
