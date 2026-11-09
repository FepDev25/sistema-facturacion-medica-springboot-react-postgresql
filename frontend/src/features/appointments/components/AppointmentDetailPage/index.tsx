import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { ClipboardCheck, FileText, ShieldAlert, Stethoscope, UserRound } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { AllergyAlert } from '@/components/AllergyAlert'
import { BackToListButton } from '@/components/BackToListButton'
import { DetailSkeleton, QueryError } from '@/components/DetailState'
import { PageHeader } from '@/components/layout/PageHeader'
import { NO_PERMISSION_MESSAGE, useRolePermissions } from '@/features/auth/hooks/useRolePermissions'
import { useLoggedInDoctorId } from '@/features/auth/hooks/useLoggedInDoctorId'
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
import { usePatient } from '@/features/patients/hooks/usePatients'

export function AppointmentDetailPage() {
  const {
    role,
    canCompleteAppointment,
    canManagePatients,
    canManageInvoices,
    canRegisterPayments,
  } = useRolePermissions()
  const canViewInvoices = canManageInvoices || canRegisterPayments
  const loggedInDoctorId = useLoggedInDoctorId()
  const { id } = useParams({ from: '/appointments/$id' })
  const [completeDrawerOpen, setCompleteDrawerOpen] = useState(false)

  const appointmentQuery = useAppointment(id)
  const recordQuery = useAppointmentMedicalRecord(id)
  const confirmAppointment = useConfirmAppointment()
  const startAppointment = useStartAppointment()
  const cancelAppointment = useCancelAppointment()
  const noShowAppointment = useNoShowAppointment()

  if (appointmentQuery.isLoading) {
    return <DetailSkeleton label="Cargando cita" />
  }

  if (appointmentQuery.isError) {
    return (
      <QueryError
        message="No se pudo cargar la cita. Revisa tu conexión e intenta de nuevo."
        onRetry={() => void appointmentQuery.refetch()}
      />
    )
  }

  const appointment = appointmentQuery.data
  if (!appointment) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-muted-foreground mb-4">No se encontró la cita.</p>
        <BackToListButton fallbackTo="/appointments" label="Volver a citas" />
      </div>
    )
  }

  const isOwnAppointment =
    role !== 'DOCTOR' || !loggedInDoctorId || appointment.doctorId === loggedInDoctorId
  const canOperate = isOwnAppointment && canManagePatients
  const canComplete = isOwnAppointment && canCompleteAppointment

  const medicalRecord = recordQuery.data

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Detalle de cita"
        subtitle={formatDateTime(appointment.scheduledAt)}
        actions={
          <>
            {appointment.status === 'in_progress' && canComplete ? (
              <Button
                size="sm"
                onClick={() => {
                  setCompleteDrawerOpen(true)
                }}
              >
                Completar cita
              </Button>
            ) : null}
            <BackToListButton fallbackTo="/appointments" label="Volver a citas" />
          </>
        }
      />

      <div className="flex-1 px-6 py-5 overflow-auto space-y-6">
        {!isOwnAppointment && (
          <div className="rounded-md border border-warning/25 bg-warning/10 p-4 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="text-sm font-medium text-warning">Solo lectura</p>
              <p className="text-xs text-warning">
                Esta cita pertenece a otro médico. No puedes modificarla.
              </p>
            </div>
          </div>
        )}

        <PatientAllergiesSection patientId={appointment.patientId} />

        <AppointmentStatusFlow
          status={appointment.status}
          canOperate={canOperate}
          canComplete={canComplete}
          onConfirm={() => {
            if (!canOperate) {
              toast.error(NO_PERMISSION_MESSAGE)
              return
            }
            confirmAppointment.mutate(appointment.id)
          }}
          onStart={() => {
            if (!canOperate) {
              toast.error(NO_PERMISSION_MESSAGE)
              return
            }
            startAppointment.mutate(appointment.id)
          }}
          onComplete={() => {
            if (!canComplete) {
              toast.error(NO_PERMISSION_MESSAGE)
              return
            }
            setCompleteDrawerOpen(true)
          }}
          onNoShow={() => {
            if (!canOperate) {
              toast.error(NO_PERMISSION_MESSAGE)
              return
            }
            noShowAppointment.mutate(appointment.id)
          }}
          onCancel={() => {
            if (!canOperate) {
              toast.error(NO_PERMISSION_MESSAGE)
              return
            }
            cancelAppointment.mutate(appointment.id)
          }}
        />

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-sm font-semibold text-foreground mb-3">Resumen de atención</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Estado</p>
              <div className="mt-1">
                <StatusBadge
                  status={appointment.status}
                  label={APPOINTMENT_STATUS_LABELS[appointment.status]}
                />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duración</p>
              <p className="text-sm text-foreground">{appointment.durationMinutes} minutos</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Inicio</p>
              <p className="text-sm text-foreground">{formatDateTime(appointment.scheduledAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fin estimado</p>
              <p className="text-sm text-foreground">
                {formatDateTime(appointment.scheduledEndAt)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <UserRound className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Paciente</h2>
          </div>
          <p className="text-sm text-foreground">
            {appointment.patientFirstName} {appointment.patientLastName}
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Médico</h2>
          </div>
          <p className="text-sm text-foreground">
            Dr. {appointment.doctorFirstName} {appointment.doctorLastName}
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Notas clínicas</h2>
          </div>
          <p className="text-sm text-foreground mb-3">
            {appointment.chiefComplaint ?? 'Sin motivo registrado.'}
          </p>
          <p className="text-sm text-muted-foreground">
            {appointment.notes ?? 'Sin notas adicionales.'}
          </p>
          {medicalRecord && (
            <div className="mt-4 rounded-md border border-success/25 bg-success/10 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-success" />
                <div>
                  <p className="text-xs font-medium text-success">Expediente generado</p>
                  <p className="text-xs text-success">{formatDateTime(medicalRecord.recordDate)}</p>
                </div>
              </div>
              <Link
                to="/medical-records/$id"
                params={{ id: medicalRecord.id }}
                className="text-xs text-success underline hover:text-success"
              >
                Ver expediente
              </Link>
            </div>
          )}
          {canViewInvoices && appointment.invoiceId && appointment.invoiceNumber ? (
            <div className="mt-3 rounded-md border border-info/25 bg-info/10 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-info" />
                <div>
                  <p className="text-xs font-medium text-info">Factura generada</p>
                  <p className="text-xs text-info font-mono">{appointment.invoiceNumber}</p>
                </div>
              </div>
              <Link
                to="/invoices/$id"
                params={{ id: appointment.invoiceId }}
                className="text-xs text-info underline hover:text-info"
              >
                Ver factura
              </Link>
            </div>
          ) : null}
        </section>
      </div>

      <CompleteAppointmentDrawer
        appointmentId={appointment.id}
        patientId={appointment.patientId}
        open={completeDrawerOpen}
        onOpenChange={setCompleteDrawerOpen}
      />
    </div>
  )
}

function PatientAllergiesSection({ patientId }: { patientId: string }) {
  const { data: patient } = usePatient(patientId)

  if (!patient) return null

  return (
    <AllergyAlert
      allergies={patient.allergies}
      patientName={`${patient.firstName} ${patient.lastName}`}
    />
  )
}
