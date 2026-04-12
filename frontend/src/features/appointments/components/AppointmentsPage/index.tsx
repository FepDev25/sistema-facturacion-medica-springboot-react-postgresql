import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/DataTable'
import {
  NO_PERMISSION_MESSAGE,
  useRolePermissions,
} from '@/features/auth/hooks/useRolePermissions'
import { useLoggedInDoctorId } from '@/features/auth/hooks/useLoggedInDoctorId'
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
  const { role, canManagePatients } = useRolePermissions()
  const loggedInDoctorId = useLoggedInDoctorId()

  const [statusFilter, setStatusFilter] = useState<AppointmentStatusFilter>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [page, setPage] = useState(0)
  const pageSize = 20

  const isDoctorView = role === 'DOCTOR' && !!loggedInDoctorId

  const { data: appointmentsPage, isLoading } = useAppointments({
    status: statusFilter === 'all' ? undefined : statusFilter,
    doctorId: isDoctorView ? loggedInDoctorId : undefined,
    page,
    size: pageSize,
  })

  const appointments = appointmentsPage?.content ?? []

  const confirmAppointment = useConfirmAppointment()
  const startAppointment = useStartAppointment()
  const cancelAppointment = useCancelAppointment()
  const noShowAppointment = useNoShowAppointment()

  const columns = useMemo(
    () =>
      getAppointmentColumns({
        onConfirm: (item) => {
          if (!canManagePatients) {
            toast.error(NO_PERMISSION_MESSAGE)
            return
          }
          confirmAppointment.mutate(item.id)
        },
        onStart: (item) => {
          if (!canManagePatients) {
            toast.error(NO_PERMISSION_MESSAGE)
            return
          }
          startAppointment.mutate(item.id)
        },
        onCancel: (item) => {
          if (!canManagePatients) {
            toast.error(NO_PERMISSION_MESSAGE)
            return
          }
          cancelAppointment.mutate(item.id)
        },
        onNoShow: (item) => {
          if (!canManagePatients) {
            toast.error(NO_PERMISSION_MESSAGE)
            return
          }
          noShowAppointment.mutate(item.id)
        },
        canOperate: canManagePatients,
      }),
    [
      cancelAppointment,
      canManagePatients,
      confirmAppointment,
      noShowAppointment,
      startAppointment,
    ],
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm text-slate-600">Estado:</span>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as AppointmentStatusFilter)
                setPage(0)
              }}
            >
              <SelectTrigger className="h-8 w-full sm:w-52 text-sm">
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

          <Button
            size="sm"
            className="h-8 gap-1.5 w-full sm:w-auto"
            disabled={!canManagePatients || isDoctorView}
            onClick={() => {
              if (!canManagePatients) {
                toast.error(NO_PERMISSION_MESSAGE)
                return
              }
              setDrawerOpen(true)
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva cita
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={appointments}
          isLoading={isLoading}
          pageSize={pageSize}
          emptyMessage="No hay citas para el filtro seleccionado."
        />

        {!isLoading && appointmentsPage && appointmentsPage.totalPages > 1 ? (
          <div className="mt-3 flex items-center justify-between px-1">
            <p className="text-xs text-slate-500">
              Pagina {appointmentsPage.number + 1} de {appointmentsPage.totalPages} -{' '}
              {appointmentsPage.totalElements} citas
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                aria-label="Pagina anterior"
                onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                disabled={appointmentsPage.number <= 0}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                aria-label="Pagina siguiente"
                onClick={() =>
                  setPage((prev) =>
                    appointmentsPage.number + 1 >= appointmentsPage.totalPages ? prev : prev + 1,
                  )
                }
                disabled={appointmentsPage.number + 1 >= appointmentsPage.totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <AppointmentDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  )
}
