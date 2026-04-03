import type { ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { Check, Clock3, Eye, Play, UserRoundX, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { APPOINTMENT_STATUS_LABELS } from '@/types/enums'
import { formatDateTime } from '@/lib/utils'
import type { AppointmentResponse } from '@/types/appointment'

const STATUS_CLASS: Record<string, string> = {
  scheduled: 'border-blue-200 text-blue-700 bg-blue-50',
  confirmed: 'border-cyan-200 text-cyan-700 bg-cyan-50',
  in_progress: 'border-indigo-200 text-indigo-700 bg-indigo-50',
  completed: 'border-green-200 text-green-700 bg-green-50',
  cancelled: 'border-slate-200 text-slate-600 bg-slate-50',
  no_show: 'border-amber-200 text-amber-700 bg-amber-50',
}

interface AppointmentColumnsOptions {
  onConfirm: (item: AppointmentResponse) => void
  onStart: (item: AppointmentResponse) => void
  onCancel: (item: AppointmentResponse) => void
  onNoShow: (item: AppointmentResponse) => void
}

export function getAppointmentColumns({
  onConfirm,
  onStart,
  onCancel,
  onNoShow,
}: AppointmentColumnsOptions): ColumnDef<AppointmentResponse, unknown>[] {
  return [
    {
      accessorKey: 'scheduledAt',
      header: 'Fecha y hora',
      size: 175,
      cell: ({ row }) => (
        <span className="text-sm text-slate-700">{formatDateTime(row.original.scheduledAt)}</span>
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
      id: 'doctor',
      header: 'Médico',
      cell: ({ row }) => (
        <p className="text-sm text-slate-700">
          Dr. {row.original.doctor.firstName} {row.original.doctor.lastName}
        </p>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      size: 120,
      cell: ({ row }) => (
        <Badge variant="outline" className={STATUS_CLASS[row.original.status]}>
          {APPOINTMENT_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: 'chiefComplaint',
      header: 'Motivo',
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.chiefComplaint}</span>,
    },
    {
      id: 'actions',
      size: 190,
      cell: ({ row }) => {
        const item = row.original

        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 hover:text-slate-900"
              aria-label="Ver detalle de la cita"
              title="Ver detalle"
            >
              <Link to="/appointments/$id" params={{ id: item.id }}>
                <Eye className="h-3.5 w-3.5" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 hover:text-slate-900"
              aria-label="Confirmar cita"
              onClick={() => onConfirm(item)}
              disabled={item.status !== 'scheduled'}
              title="Confirmar"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 hover:text-slate-900"
              aria-label="Iniciar cita"
              onClick={() => onStart(item)}
              disabled={item.status !== 'confirmed'}
              title="Iniciar"
            >
              <Play className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 hover:text-slate-900"
              aria-label="Marcar cita como no show"
              onClick={() => onNoShow(item)}
              disabled={item.status !== 'scheduled' && item.status !== 'confirmed'}
              title="No show"
            >
              <UserRoundX className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 hover:text-slate-900"
              aria-label="Cancelar cita"
              onClick={() => onCancel(item)}
              disabled={
                item.status === 'cancelled' ||
                item.status === 'completed' ||
                item.status === 'no_show'
              }
              title="Cancelar"
            >
              <X className="h-3.5 w-3.5" />
            </Button>

            <span className="ml-1 text-[11px] text-slate-400 flex items-center gap-1">
              <Clock3 className="h-3 w-3" />
              {item.durationMinutes}m
            </span>
          </div>
        )
      },
    },
  ]
}
