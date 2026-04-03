import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/DataTable'
import { APPOINTMENT_STATUS_LABELS } from '@/types/enums'
import {
  useAppointments,
  useCancelAppointment,
  useConfirmAppointment,
  useNoShowAppointment,
  useStartAppointment,
} from '../../hooks/useAppointments'
import { getAppointmentColumns } from '../appointmentColumns'
import { AppointmentDrawer } from '../AppointmentDrawer'

type AppointmentStatusFilter =
  | 'all'
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export function AppointmentsPage() {
  const [statusFilter, setStatusFilter] = useState<AppointmentStatusFilter>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: appointments = [], isLoading } = useAppointments({
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  const confirmAppointment = useConfirmAppointment()
  const startAppointment = useStartAppointment()
  const cancelAppointment = useCancelAppointment()
  const noShowAppointment = useNoShowAppointment()

  const columns = useMemo(
    () =>
      getAppointmentColumns({
        onConfirm: (item) => confirmAppointment.mutate(item.id),
        onStart: (item) => startAppointment.mutate(item.id),
        onCancel: (item) => cancelAppointment.mutate(item.id),
        onNoShow: (item) => noShowAppointment.mutate(item.id),
      }),
    [cancelAppointment, confirmAppointment, noShowAppointment, startAppointment],
  )

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">Citas</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Gestión operativa de agenda, atención y estados de consulta
        </p>
      </div>

      <div className="flex-1 px-6 py-5 overflow-auto">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Estado:</span>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as AppointmentStatusFilter)}
            >
              <SelectTrigger className="h-8 w-52 text-sm">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="scheduled">{APPOINTMENT_STATUS_LABELS.scheduled}</SelectItem>
                <SelectItem value="confirmed">{APPOINTMENT_STATUS_LABELS.confirmed}</SelectItem>
                <SelectItem value="in_progress">{APPOINTMENT_STATUS_LABELS.in_progress}</SelectItem>
                <SelectItem value="completed">{APPOINTMENT_STATUS_LABELS.completed}</SelectItem>
                <SelectItem value="cancelled">{APPOINTMENT_STATUS_LABELS.cancelled}</SelectItem>
                <SelectItem value="no_show">{APPOINTMENT_STATUS_LABELS.no_show}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button size="sm" className="h-8 gap-1.5" onClick={() => setDrawerOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Nueva cita
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={appointments}
          isLoading={isLoading}
          pageSize={20}
          emptyMessage="No hay citas para el filtro seleccionado."
        />
      </div>

      <AppointmentDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  )
}
