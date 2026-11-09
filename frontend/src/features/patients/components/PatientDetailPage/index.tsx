import { useParams } from '@tanstack/react-router'
import { CalendarClock, FileHeart, Shield } from 'lucide-react'
import { AllergyAlert } from '@/components/AllergyAlert'
import { DataTable } from '@/components/DataTable'
import { BackToListButton } from '@/components/BackToListButton'
import { DetailSkeleton, QueryError } from '@/components/DetailState'
import { PageHeader } from '@/components/layout/PageHeader'
import { GENDER_LABELS } from '@/types/enums'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  usePatient,
  usePatientAppointments,
  usePatientInvoices,
  usePatientPolicies,
} from '../../hooks/usePatients'
import { usePatientMedicalRecords } from '@/features/medical-records/hooks/useMedicalRecords'
import { PatientHistoryChat } from '@/features/ai/components/PatientHistoryChat'
import { getPatientAppointmentColumns } from '../patientAppointmentColumns'
import { getPatientInvoiceColumns } from '../patientInvoiceColumns'
import { getPatientMedicalRecordColumns } from '../patientMedicalRecordColumns'
import { getPatientPolicyColumns } from '../patientPolicyColumns'

export function PatientDetailPage() {
  const { id } = useParams({ from: '/patients/$id' })

  const patientQuery = usePatient(id)
  const appointmentsQuery = usePatientAppointments(id)
  const policiesQuery = usePatientPolicies(id, false)
  const invoicesQuery = usePatientInvoices(id)
  const medicalRecordsQuery = usePatientMedicalRecords(id)

  const patient = patientQuery.data

  if (patientQuery.isLoading) {
    return <DetailSkeleton label="Cargando paciente" />
  }

  if (patientQuery.isError) {
    return (
      <QueryError
        message="No se pudo cargar el paciente. Revisa tu conexión e intenta de nuevo."
        onRetry={() => void patientQuery.refetch()}
      />
    )
  }

  if (!patient) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-muted-foreground mb-4">No se encontró el paciente.</p>
        <BackToListButton fallbackTo="/patients" label="Volver a pacientes" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={`${patient.firstName} ${patient.lastName}`}
        subtitle="Ficha clínica del paciente"
        actions={<BackToListButton fallbackTo="/patients" label="Volver a pacientes" />}
      />

      <div className="flex-1 px-6 py-5 overflow-auto space-y-6">
        <AllergyAlert
          allergies={patient.allergies}
          patientName={`${patient.firstName} ${patient.lastName}`}
        />

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-sm font-semibold text-foreground mb-3">Información general</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">DNI</p>
              <p className="font-mono text-sm text-foreground">{patient.dni}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Género</p>
              <p className="text-sm text-foreground">{GENDER_LABELS[patient.gender]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nacimiento</p>
              <p className="text-sm text-foreground">{formatDate(patient.birthDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Teléfono</p>
              <p className="text-sm text-foreground">{patient.phone}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm text-foreground">{patient.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tipo de sangre</p>
              <p className="text-sm text-foreground">{patient.bloodType ?? '—'}</p>
            </div>
            <div className="md:col-span-2 lg:col-span-2">
              <p className="text-xs text-muted-foreground">Dirección</p>
              <p className="text-sm text-foreground">{patient.address ?? '—'}</p>
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <p className="text-xs text-muted-foreground">Alergias</p>
              {patient.allergies ? (
                <p className="text-sm text-foreground">{patient.allergies}</p>
              ) : (
                <p className="text-sm text-muted-foreground/70">—</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Creado</p>
              <p className="text-sm text-foreground">{formatDateTime(patient.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Actualizado</p>
              <p className="text-sm text-foreground">{formatDateTime(patient.updatedAt)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Citas del paciente</h2>
          </div>
          <DataTable
            columns={getPatientAppointmentColumns()}
            data={appointmentsQuery.data ?? []}
            isLoading={appointmentsQuery.isLoading}
            pageSize={5}
            emptyMessage="Sin citas registradas para este paciente."
          />
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Pólizas de seguro</h2>
          </div>
          <DataTable
            columns={getPatientPolicyColumns()}
            data={policiesQuery.data ?? []}
            isLoading={policiesQuery.isLoading}
            pageSize={5}
            emptyMessage="Sin pólizas registradas para este paciente."
          />
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Facturas del paciente</h2>
          </div>
          <DataTable
            columns={getPatientInvoiceColumns()}
            data={invoicesQuery.data ?? []}
            isLoading={invoicesQuery.isLoading}
            pageSize={5}
            emptyMessage="Sin facturas registradas para este paciente."
          />
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <FileHeart className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Expedientes clinicos</h2>
          </div>
          <DataTable
            columns={getPatientMedicalRecordColumns()}
            data={medicalRecordsQuery.data ?? []}
            isLoading={medicalRecordsQuery.isLoading}
            pageSize={5}
            emptyMessage="Sin expedientes registrados para este paciente."
          />
        </section>

        <PatientHistoryChat patientId={id} />
      </div>
    </div>
  )
}
