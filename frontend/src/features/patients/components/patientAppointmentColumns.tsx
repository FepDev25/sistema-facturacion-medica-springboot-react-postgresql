import type { ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { APPOINTMENT_STATUS_LABELS } from '@/types/enums'
import type { AppointmentSummaryResponse } from '@/types/appointment'
import { formatDateTime } from '@/lib/utils'

const STATUS_CLASS: Record<string, string> = {
  scheduled: 'border-blue-200 text-blue-700 bg-blue-50',
  confirmed: 'border-cyan-200 text-cyan-700 bg-cyan-50',
  in_progress: 'border-indigo-200 text-indigo-700 bg-indigo-50',
  completed: 'border-green-200 text-green-700 bg-green-50',
  cancelled: 'border-slate-200 text-slate-600 bg-slate-50',
  no_show: 'border-amber-200 text-amber-700 bg-amber-50',
}

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
        <Badge variant="outline" className={STATUS_CLASS[row.original.status]}>
          {APPOINTMENT_STATUS_LABELS[row.original.status]}
        </Badge>
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
