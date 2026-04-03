import { useParams } from '@tanstack/react-router'
import { ClipboardCheck, Stethoscope, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BackToListButton } from '@/components/BackToListButton'
import { APPOINTMENT_STATUS_LABELS } from '@/types/enums'
import { formatDateTime } from '@/lib/utils'
import { useAppointment, useAppointmentMedicalRecord } from '../../hooks/useAppointments'

const STATUS_CLASS: Record<string, string> = {
  scheduled: 'border-blue-200 text-blue-700 bg-blue-50',
  confirmed: 'border-cyan-200 text-cyan-700 bg-cyan-50',
  in_progress: 'border-indigo-200 text-indigo-700 bg-indigo-50',
  completed: 'border-green-200 text-green-700 bg-green-50',
  cancelled: 'border-slate-200 text-slate-600 bg-slate-50',
  no_show: 'border-amber-200 text-amber-700 bg-amber-50',
}

export function AppointmentDetailPage() {
  const { id } = useParams({ from: '/appointments/$id' })

  const appointmentQuery = useAppointment(id)
  const recordQuery = useAppointmentMedicalRecord(id)

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
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Detalle de cita</h1>
            <p className="text-sm text-slate-500 mt-0.5">{formatDateTime(appointment.scheduledAt)}</p>
          </div>
          <BackToListButton fallbackTo="/appointments" label="Volver a citas" />
        </div>
      </div>

      <div className="flex-1 px-6 py-5 overflow-auto space-y-6">
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
          <p className="text-xs text-slate-500 mt-1">
            Alergias: {appointment.patient.allergies ?? 'Sin registro'}
          </p>
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
    </div>
  )
}
