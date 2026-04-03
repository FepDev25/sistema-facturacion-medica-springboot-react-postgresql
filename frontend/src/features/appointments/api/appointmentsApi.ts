import { z } from 'zod'
import { mockDelay, paginateArray } from '@/lib/mock-utils'
import { APPOINTMENTS_MOCK, DOCTORS_MOCK, MEDICAL_RECORDS_MOCK, PATIENTS_MOCK } from '@/mocks'
import type { PageResponse } from '@/types/common'
import type {
  AppointmentCreateRequest,
  AppointmentResponse,
  AppointmentSummaryResponse,
} from '@/types/appointment'
import type { MedicalRecordCreateRequest, MedicalRecordResponse } from '@/types/medical-record'

const APPOINTMENT_STATUSES = [
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
] as const

export const AppointmentFormSchema = z.object({
  patientId: z.string().min(1, 'Requerido'),
  doctorId: z.string().min(1, 'Requerido'),
  scheduledAt: z.string().min(1, 'Requerido'),
  durationMinutes: z
    .number({ message: 'Debe ser un número' })
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 minuto')
    .max(240, 'Máximo 240 minutos'),
  chiefComplaint: z.string().min(1, 'Requerido').max(500, 'Máximo 500 caracteres'),
  notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
})

export type AppointmentFormValues = z.infer<typeof AppointmentFormSchema>

let appointmentsStore: AppointmentResponse[] = [...APPOINTMENTS_MOCK]
let medicalRecordsStore: MedicalRecordResponse[] = [...MEDICAL_RECORDS_MOCK]

export interface AppointmentsListParams {
  doctorId?: string
  patientId?: string
  status?: (typeof APPOINTMENT_STATUSES)[number]
  from?: string
  to?: string
  page?: number
  size?: number
  sort?: string
}

export async function getAppointments(
  params: AppointmentsListParams = {},
): Promise<PageResponse<AppointmentResponse>> {
  await mockDelay()

  const { doctorId, patientId, status, from, to, page = 0, size = 20 } = params

  let items = [...appointmentsStore]
  if (doctorId) {
    items = items.filter((appointment) => appointment.doctor.id === doctorId)
  }
  if (patientId) {
    items = items.filter((appointment) => appointment.patient.id === patientId)
  }
  if (status) {
    items = items.filter((appointment) => appointment.status === status)
  }
  if (from) {
    const fromDate = new Date(from).getTime()
    items = items.filter((appointment) => new Date(appointment.scheduledAt).getTime() >= fromDate)
  }
  if (to) {
    const toDate = new Date(to).getTime()
    items = items.filter((appointment) => new Date(appointment.scheduledAt).getTime() <= toDate)
  }

  items.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())

  return paginateArray(items, page, size)
}

export async function getAppointmentById(id: string): Promise<AppointmentResponse> {
  await mockDelay()

  const appointment = appointmentsStore.find((item) => item.id === id)
  if (!appointment) {
    throw new Error('Cita no encontrada')
  }

  return appointment
}

function buildScheduledEndAt(scheduledAt: string, durationMinutes: number): string {
  const start = new Date(scheduledAt)
  start.setMinutes(start.getMinutes() + durationMinutes)
  return start.toISOString()
}

export async function createAppointment(
  data: AppointmentCreateRequest,
): Promise<AppointmentResponse> {
  await mockDelay()

  const patient = PATIENTS_MOCK.find((item) => item.id === data.patientId)
  const doctor = DOCTORS_MOCK.find((item) => item.id === data.doctorId)
  if (!patient || !doctor) {
    throw new Error('Paciente o médico inválido')
  }

  const newItem: AppointmentResponse = {
    id: crypto.randomUUID(),
    patient: {
      id: patient.id,
      dni: patient.dni,
      firstName: patient.firstName,
      lastName: patient.lastName,
      allergies: patient.allergies,
    },
    doctor: {
      id: doctor.id,
      licenseNumber: doctor.licenseNumber,
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      specialty: doctor.specialty,
    },
    scheduledAt: data.scheduledAt,
    scheduledEndAt: buildScheduledEndAt(data.scheduledAt, data.durationMinutes),
    durationMinutes: data.durationMinutes,
    status: 'scheduled',
    chiefComplaint: data.chiefComplaint,
    notes: data.notes ?? null,
    createdAt: new Date().toISOString(),
  }

  appointmentsStore = [newItem, ...appointmentsStore]
  return newItem
}

function transitionStatus(id: string, nextStatus: AppointmentResponse['status']): AppointmentResponse {
  const existing = appointmentsStore.find((item) => item.id === id)
  if (!existing) {
    throw new Error('Cita no encontrada')
  }

  const updated: AppointmentResponse = {
    ...existing,
    status: nextStatus,
  }

  appointmentsStore = appointmentsStore.map((item) => (item.id === id ? updated : item))
  return updated
}

export async function confirmAppointment(id: string): Promise<AppointmentResponse> {
  await mockDelay()
  return transitionStatus(id, 'confirmed')
}

export async function startAppointment(id: string): Promise<AppointmentResponse> {
  await mockDelay()
  return transitionStatus(id, 'in_progress')
}

export async function completeAppointment(
  id: string,
  data: MedicalRecordCreateRequest,
): Promise<AppointmentResponse> {
  await mockDelay()

  const updated = transitionStatus(id, 'completed')

  const existsRecord = medicalRecordsStore.some(
    (record) => record.appointment.id === updated.id,
  )
  if (!existsRecord) {
    medicalRecordsStore = [
      {
        id: crypto.randomUUID(),
        patient: updated.patient,
        appointment: {
          id: updated.id,
          scheduledAt: updated.scheduledAt,
          status: 'completed',
          chiefComplaint: updated.chiefComplaint,
        },
        vitalSigns: data.vitalSigns ?? null,
        physicalExam: data.physicalExam ?? null,
        clinicalNotes: data.clinicalNotes,
        recordDate: data.recordDate,
        diagnoses: [],
        prescriptions: [],
        procedures: [],
        createdAt: new Date().toISOString(),
      },
      ...medicalRecordsStore,
    ]
  }

  return updated
}

export async function cancelAppointment(id: string): Promise<AppointmentResponse> {
  await mockDelay()
  return transitionStatus(id, 'cancelled')
}

export async function noShowAppointment(id: string): Promise<AppointmentResponse> {
  await mockDelay()
  return transitionStatus(id, 'no_show')
}

export async function getAvailability(
  doctorId: string,
  from: string,
  to: string,
): Promise<AppointmentSummaryResponse[]> {
  await mockDelay()

  const fromDate = new Date(from).getTime()
  const toDate = new Date(to).getTime()

  return appointmentsStore
    .filter((appointment) => appointment.doctor.id === doctorId)
    .filter((appointment) => {
      const appointmentDate = new Date(appointment.scheduledAt).getTime()
      return appointmentDate >= fromDate && appointmentDate <= toDate
    })
    .map((appointment) => ({
      id: appointment.id,
      scheduledAt: appointment.scheduledAt,
      status: appointment.status,
      chiefComplaint: appointment.chiefComplaint,
    }))
}

export async function getMedicalRecordByAppointment(
  appointmentId: string,
): Promise<MedicalRecordResponse | null> {
  await mockDelay()

  return (
    medicalRecordsStore.find((record) => record.appointment.id === appointmentId) ?? null
  )
}

export function toAppointmentCreateRequest(
  values: AppointmentFormValues,
): AppointmentCreateRequest {
  return {
    patientId: values.patientId,
    doctorId: values.doctorId,
    scheduledAt: new Date(values.scheduledAt).toISOString(),
    durationMinutes: values.durationMinutes,
    chiefComplaint: values.chiefComplaint.trim(),
    notes: values.notes && values.notes.trim().length > 0 ? values.notes.trim() : null,
  }
}
