import { useParams } from '@tanstack/react-router'
import { CalendarClock, Link2, Mail, Phone, Stethoscope } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BackToListButton } from '@/components/BackToListButton'
import { DetailSkeleton, QueryError } from '@/components/DetailState'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatDateTime } from '@/lib/utils'
import { useAppointments } from '@/features/appointments/hooks/useAppointments'
import { useDoctorById } from '../../hooks/useDoctors'

export function DoctorDetailPage() {
  const { id } = useParams({ from: '/doctors/$id' })
  const { data: doctor, isLoading, isError, refetch } = useDoctorById(id)
  const { data: doctorAppointmentsPage } = useAppointments({ doctorId: id, page: 0, size: 20 })
  const doctorAppointments = doctorAppointmentsPage?.content ?? []

  if (isLoading) {
    return <DetailSkeleton label="Cargando médico" />
  }

  if (isError) {
    return (
      <QueryError
        message="No se pudo cargar el médico. Revisa tu conexión e intenta de nuevo."
        onRetry={() => void refetch()}
      />
    )
  }

  if (!doctor) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-muted-foreground mb-4">No se encontró el médico.</p>
        <BackToListButton fallbackTo="/doctors" label="Volver a médicos" />
      </div>
    )
  }

  const upcomingAppointments = [...doctorAppointments]
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 8)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={`Dr. ${doctor.firstName} ${doctor.lastName}`}
        subtitle="Ficha profesional"
        actions={<BackToListButton fallbackTo="/doctors" label="Volver a médicos" />}
      />

      <div className="flex-1 px-6 py-5 overflow-auto space-y-6">
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-sm font-semibold text-foreground mb-3">Información general</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Licencia</p>
              <p className="font-mono text-sm text-foreground">{doctor.licenseNumber}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estado</p>
              {doctor.isActive ? (
                <Badge className="bg-success/15 text-success hover:bg-success/15 border-0">
                  Activo
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-muted-foreground/70">
                  Inactivo
                </Badge>
              )}
            </div>
            <div className="lg:col-span-2">
              <p className="text-xs text-muted-foreground">Especialidad</p>
              <p className="text-sm text-foreground flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                {doctor.specialty}
              </p>
            </div>
            <div className="lg:col-span-2">
              <p className="text-xs text-muted-foreground">Contacto</p>
              <p className="text-sm text-foreground flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {doctor.phone}
              </p>
            </div>
            <div className="lg:col-span-2">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm text-foreground flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {doctor.email}
              </p>
            </div>
            <div className="lg:col-span-2">
              <p className="text-xs text-muted-foreground">Acceso al sistema</p>
              {doctor.userId ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-info/15 text-info hover:bg-info/15 border-0">
                    <Link2 className="h-3 w-3 mr-1" />
                    Vinculado
                  </Badge>
                  <span className="text-sm text-foreground font-mono">{doctor.username}</span>
                </div>
              ) : (
                <Badge variant="secondary" className="text-muted-foreground/70">
                  Sin acceso
                </Badge>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Agenda reciente</h2>
          </div>

          {upcomingAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin citas registradas para este médico.</p>
          ) : (
            <div className="space-y-2">
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="rounded-md border border-border/60 bg-muted/50 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-foreground">
                      {appointment.patientFirstName} {appointment.patientLastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(appointment.scheduledAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
