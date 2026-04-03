import { useParams } from '@tanstack/react-router'
import { CalendarClock, Mail, Phone, Stethoscope } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BackToListButton } from '@/components/BackToListButton'
import { APPOINTMENTS_MOCK } from '@/mocks'
import { formatDateTime } from '@/lib/utils'
import { useDoctors } from '../../hooks/useDoctors'

export function DoctorDetailPage() {
  const { id } = useParams({ from: '/doctors/$id' })
  const { data: doctors = [], isLoading } = useDoctors({ includeInactive: true })

  if (isLoading) {
    return <div className="px-6 py-8 text-sm text-slate-500">Cargando médico...</div>
  }

  const doctor = doctors.find((item) => item.id === id)
  if (!doctor) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-slate-500 mb-4">No se encontró el médico.</p>
        <BackToListButton fallbackTo="/doctors" label="Volver a médicos" />
      </div>
    )
  }

  const upcomingAppointments = APPOINTMENTS_MOCK.filter(
    (appointment) => appointment.doctor.id === doctor.id,
  )
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    )
    .slice(0, 8)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Dr. {doctor.firstName} {doctor.lastName}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Ficha profesional</p>
          </div>
          <BackToListButton fallbackTo="/doctors" label="Volver a médicos" />
        </div>
      </div>

      <div className="flex-1 px-6 py-5 overflow-auto space-y-6">
        <section className="rounded-md border border-border bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Información general</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Licencia</p>
              <p className="font-mono text-sm text-slate-700">{doctor.licenseNumber}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Estado</p>
              {doctor.isActive ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0">Activo</Badge>
              ) : (
                <Badge variant="secondary" className="text-slate-400">
                  Inactivo
                </Badge>
              )}
            </div>
            <div className="lg:col-span-2">
              <p className="text-xs text-slate-500">Especialidad</p>
              <p className="text-sm text-slate-800 flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-slate-500" />
                {doctor.specialty}
              </p>
            </div>
            <div className="lg:col-span-2">
              <p className="text-xs text-slate-500">Contacto</p>
              <p className="text-sm text-slate-800 flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-500" />
                {doctor.phone}
              </p>
            </div>
            <div className="lg:col-span-2">
              <p className="text-xs text-slate-500">Email</p>
              <p className="text-sm text-slate-800 flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-500" />
                {doctor.email}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Agenda reciente</h2>
          </div>

          {upcomingAppointments.length === 0 ? (
            <p className="text-sm text-slate-500">Sin citas registradas para este médico.</p>
          ) : (
            <div className="space-y-2">
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-800">
                      {appointment.patient.firstName} {appointment.patient.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{formatDateTime(appointment.scheduledAt)}</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{appointment.chiefComplaint}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
