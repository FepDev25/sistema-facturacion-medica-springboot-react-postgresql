import type { ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { Check, Eye, Play, UserRoundX, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { APPOINTMENT_STATUS_LABELS } from '@/types/enums'
import { formatDateTime } from '@/lib/utils'
import type { AppointmentSummaryResponse } from '@/types/appointment'

interface AppointmentColumnsOptions {
  onConfirm: (item: AppointmentSummaryResponse) => void
  onStart: (item: AppointmentSummaryResponse) => void
  onCancel: (item: AppointmentSummaryResponse) => void
  onNoShow: (item: AppointmentSummaryResponse) => void
  canOperate: boolean
}

export function getAppointmentColumns({
  onConfirm,
  onStart,
  onCancel,
  onNoShow,
  canOperate,
}: AppointmentColumnsOptions): ColumnDef<AppointmentSummaryResponse, unknown>[] {
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
      size: 120,
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.status}
          label={APPOINTMENT_STATUS_LABELS[row.original.status]}
        />
      ),
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
              disabled={!canOperate || item.status !== 'scheduled'}
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
              disabled={!canOperate || item.status !== 'confirmed'}
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
              disabled={!canOperate || (item.status !== 'scheduled' && item.status !== 'confirmed')}
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
                !canOperate ||
                (item.status !== 'scheduled' && item.status !== 'confirmed')
              }
              title="Cancelar"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      },
    },
  ]
}
