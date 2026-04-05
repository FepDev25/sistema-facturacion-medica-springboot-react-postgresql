import { useParams } from '@tanstack/react-router'
import { CalendarClock, FileHeart, Shield } from 'lucide-react'
import { AllergyAlert } from '@/components/AllergyAlert'
import { DataTable } from '@/components/DataTable'
import { BackToListButton } from '@/components/BackToListButton'
import { GENDER_LABELS } from '@/types/enums'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  usePatient,
  usePatientAppointments,
  usePatientInvoices,
  usePatientPolicies,
} from '../../hooks/usePatients'
import { usePatientMedicalRecords } from '@/features/medical-records/hooks/useMedicalRecords'
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
    return (
      <div className="px-6 py-8 text-sm text-slate-500">Cargando paciente...</div>
    )
  }

  if (!patient) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-slate-500 mb-4">No se encontró el paciente.</p>
        <BackToListButton fallbackTo="/patients" label="Volver a pacientes" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Ficha clínica del paciente</p>
          </div>
          <BackToListButton fallbackTo="/patients" label="Volver a pacientes" />
        </div>
      </div>

      <div className="flex-1 px-6 py-5 overflow-auto space-y-6">
        <AllergyAlert
          allergies={patient.allergies}
          patientName={`${patient.firstName} ${patient.lastName}`}
        />

        <section className="rounded-md border border-border bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Información general</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">DNI</p>
              <p className="font-mono text-sm text-slate-700">{patient.dni}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Género</p>
              <p className="text-sm text-slate-800">{GENDER_LABELS[patient.gender]}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Nacimiento</p>
              <p className="text-sm text-slate-800">{formatDate(patient.birthDate)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Teléfono</p>
              <p className="text-sm text-slate-800">{patient.phone}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="text-sm text-slate-800">{patient.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Tipo de sangre</p>
              <p className="text-sm text-slate-800">{patient.bloodType ?? '—'}</p>
            </div>
            <div className="md:col-span-2 lg:col-span-2">
              <p className="text-xs text-slate-500">Dirección</p>
              <p className="text-sm text-slate-800">{patient.address ?? '—'}</p>
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <p className="text-xs text-slate-500">Alergias</p>
              {!patient.allergies ? (
                <p className="text-sm text-slate-800">—</p>
              ) : null}
            </div>
            <div>
              <p className="text-xs text-slate-500">Creado</p>
              <p className="text-sm text-slate-800">{formatDateTime(patient.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Actualizado</p>
              <p className="text-sm text-slate-800">{formatDateTime(patient.updatedAt)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Citas del paciente</h2>
          </div>
          <DataTable
            columns={getPatientAppointmentColumns()}
            data={appointmentsQuery.data ?? []}
            isLoading={appointmentsQuery.isLoading}
            pageSize={5}
            emptyMessage="Sin citas registradas para este paciente."
          />
        </section>

        <section className="rounded-md border border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Pólizas de seguro</h2>
          </div>
          <DataTable
            columns={getPatientPolicyColumns()}
            data={policiesQuery.data ?? []}
            isLoading={policiesQuery.isLoading}
            pageSize={5}
            emptyMessage="Sin pólizas registradas para este paciente."
          />
        </section>

        <section className="rounded-md border border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Facturas del paciente</h2>
          </div>
          <DataTable
            columns={getPatientInvoiceColumns()}
            data={invoicesQuery.data ?? []}
            isLoading={invoicesQuery.isLoading}
            pageSize={5}
            emptyMessage="Sin facturas registradas para este paciente."
          />
        </section>

        <section className="rounded-md border border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileHeart className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Expedientes clinicos</h2>
          </div>
          <DataTable
            columns={getPatientMedicalRecordColumns()}
            data={medicalRecordsQuery.data ?? []}
            isLoading={medicalRecordsQuery.isLoading}
            pageSize={5}
            emptyMessage="Sin expedientes registrados para este paciente."
          />
        </section>
      </div>
    </div>
  )
}
