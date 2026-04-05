import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { ClipboardCheck, Stethoscope, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AllergyAlert } from '@/components/AllergyAlert'
import { BackToListButton } from '@/components/BackToListButton'
import {
  NO_PERMISSION_MESSAGE,
  useRolePermissions,
} from '@/features/auth/hooks/useRolePermissions'
import { APPOINTMENT_STATUS_LABELS } from '@/types/enums'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { AppointmentStatusFlow } from '../AppointmentStatusFlow'
import { CompleteAppointmentDrawer } from '../CompleteAppointmentDrawer'
import {
  useAppointment,
  useAppointmentMedicalRecord,
  useCancelAppointment,
  useConfirmAppointment,
  useNoShowAppointment,
  useStartAppointment,
} from '../../hooks/useAppointments'

const STATUS_CLASS: Record<string, string> = {
  scheduled: 'border-blue-200 text-blue-700 bg-blue-50',
  confirmed: 'border-cyan-200 text-cyan-700 bg-cyan-50',
  in_progress: 'border-indigo-200 text-indigo-700 bg-indigo-50',
  completed: 'border-green-200 text-green-700 bg-green-50',
  cancelled: 'border-slate-200 text-slate-600 bg-slate-50',
  no_show: 'border-amber-200 text-amber-700 bg-amber-50',
}

export function AppointmentDetailPage() {
  const { canCompleteAppointment, canManagePatients } = useRolePermissions()
  const { id } = useParams({ from: '/appointments/$id' })
  const [completeDrawerOpen, setCompleteDrawerOpen] = useState(false)

  const appointmentQuery = useAppointment(id)
  const recordQuery = useAppointmentMedicalRecord(id)
  const confirmAppointment = useConfirmAppointment()
  const startAppointment = useStartAppointment()
  const cancelAppointment = useCancelAppointment()
  const noShowAppointment = useNoShowAppointment()

  if (appointmentQuery.isLoading) {
    return <div className="px-6 py-8 text-sm text-slate-500">Cargando cita...</div>
  }

  const appointment = appointmentQuery.data
  if (!appointment) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-slate-500 mb-4">No se encontró la cita.</p>
        <BackToListButton fallbackTo="/appointments" label="Volver a citas" />
      </div>
    )
  }

  const medicalRecord = recordQuery.data

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Detalle de cita</h1>
            <p className="text-sm text-slate-500 mt-0.5">{formatDateTime(appointment.scheduledAt)}</p>
          </div>
          <BackToListButton fallbackTo="/appointments" label="Volver a citas" />
          {appointment.status === 'in_progress' ? (
            <Button
              size="sm"
              disabled={!canCompleteAppointment}
              onClick={() => {
                if (!canCompleteAppointment) {
                  toast.error(NO_PERMISSION_MESSAGE)
                  return
                }
                setCompleteDrawerOpen(true)
              }}
            >
              Completar cita
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 px-6 py-5 overflow-auto space-y-6">
        <AllergyAlert
          allergies={appointment.patient.allergies}
          patientName={`${appointment.patient.firstName} ${appointment.patient.lastName}`}
        />

        <AppointmentStatusFlow
          status={appointment.status}
          canOperate={canManagePatients}
          canComplete={canCompleteAppointment}
          onConfirm={() => {
            if (!canManagePatients) {
              toast.error(NO_PERMISSION_MESSAGE)
              return
            }
            confirmAppointment.mutate(appointment.id)
          }}
          onStart={() => {
            if (!canManagePatients) {
              toast.error(NO_PERMISSION_MESSAGE)
              return
            }
            startAppointment.mutate(appointment.id)
          }}
          onComplete={() => {
            if (!canCompleteAppointment) {
              toast.error(NO_PERMISSION_MESSAGE)
              return
            }
            setCompleteDrawerOpen(true)
          }}
          onNoShow={() => {
            if (!canManagePatients) {
              toast.error(NO_PERMISSION_MESSAGE)
              return
            }
            noShowAppointment.mutate(appointment.id)
          }}
          onCancel={() => {
            if (!canManagePatients) {
              toast.error(NO_PERMISSION_MESSAGE)
              return
            }
            cancelAppointment.mutate(appointment.id)
          }}
        />

        <section className="rounded-md border border-border bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Resumen de atención</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Estado</p>
              <Badge variant="outline" className={STATUS_CLASS[appointment.status]}>
                {APPOINTMENT_STATUS_LABELS[appointment.status]}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-slate-500">Duración</p>
              <p className="text-sm text-slate-800">{appointment.durationMinutes} minutos</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Inicio</p>
              <p className="text-sm text-slate-800">{formatDateTime(appointment.scheduledAt)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Fin estimado</p>
              <p className="text-sm text-slate-800">{formatDateTime(appointment.scheduledEndAt)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <UserRound className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Paciente</h2>
          </div>
          <p className="text-sm text-slate-800">
            {appointment.patient.firstName} {appointment.patient.lastName}
          </p>
          <p className="text-xs text-slate-500 mt-1">DNI: {appointment.patient.dni}</p>
          {!appointment.patient.allergies ? (
            <p className="text-xs text-slate-500 mt-1">Alergias: Sin registro</p>
          ) : null}
        </section>

        <section className="rounded-md border border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Médico</h2>
          </div>
          <p className="text-sm text-slate-800">
            Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}
          </p>
          <p className="text-xs text-slate-500 mt-1">Especialidad: {appointment.doctor.specialty}</p>
          <p className="text-xs text-slate-500 mt-1">Licencia: {appointment.doctor.licenseNumber}</p>
        </section>

        <section className="rounded-md border border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardCheck className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Notas clínicas</h2>
          </div>
          <p className="text-sm text-slate-800 mb-3">{appointment.chiefComplaint}</p>
          <p className="text-sm text-slate-600">{appointment.notes ?? 'Sin notas adicionales.'}</p>
          {medicalRecord && (
            <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2">
              <p className="text-xs font-medium text-green-800">Expediente generado</p>
              <p className="text-xs text-green-700 mt-1">ID: {medicalRecord.id}</p>
              <p className="text-xs text-green-700">Fecha: {formatDateTime(medicalRecord.recordDate)}</p>
            </div>
          )}
        </section>
      </div>

      <CompleteAppointmentDrawer
        appointmentId={appointment.id}
        patientId={appointment.patient.id}
        open={completeDrawerOpen}
        onOpenChange={setCompleteDrawerOpen}
      />
    </div>
  )
}
