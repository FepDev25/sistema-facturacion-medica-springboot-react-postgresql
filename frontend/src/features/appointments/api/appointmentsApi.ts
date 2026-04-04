import { z } from 'zod'
import { apiClient } from '@/lib/axios'
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

interface ApiAppointmentSummaryResponse {
  id: string
  patientFirstName: string
  patientLastName: string
  doctorFirstName: string
  doctorLastName: string
  scheduledAt: string
  status: AppointmentSummaryResponse['status']
}

interface ApiPatientDetail {
  id: string
  dni: string
  firstName: string
  lastName: string
  allergies: string | null
}

interface ApiDoctorDetail {
  id: string
  licenseNumber: string
  firstName: string
  lastName: string
  specialty: string
}

interface ApiAppointmentResponse {
  id: string
  patientId: string
  patientFirstName: string
  patientLastName: string
  doctorId: string
  doctorFirstName: string
  doctorLastName: string
  scheduledAt: string
  scheduledEndAt: string
  durationMinutes: number
  status: AppointmentResponse['status']
  chiefComplaint: string | null
  notes: string | null
  createdAt: string | null
}

function mapAppointmentResponse(
  item: ApiAppointmentResponse,
  patient: ApiPatientDetail,
  doctor: ApiDoctorDetail,
): AppointmentResponse {
  return {
    id: item.id,
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
    scheduledAt: item.scheduledAt,
    scheduledEndAt: item.scheduledEndAt,
    durationMinutes: item.durationMinutes,
    status: item.status,
    chiefComplaint: item.chiefComplaint ?? '',
    notes: item.notes,
    createdAt: item.createdAt ?? item.scheduledAt,
  }
}

async function enrichAppointment(item: ApiAppointmentResponse): Promise<AppointmentResponse> {
  const [patientResponse, doctorResponse] = await Promise.all([
    apiClient.get<ApiPatientDetail>(`/patients/${item.patientId}`),
    apiClient.get<ApiDoctorDetail>(`/doctors/${item.doctorId}`),
  ])

  return mapAppointmentResponse(item, patientResponse.data, doctorResponse.data)
}

export async function getAppointments(
  params: AppointmentsListParams = {},
): Promise<PageResponse<AppointmentResponse>> {
  const response = await apiClient.get<PageResponse<ApiAppointmentSummaryResponse>>('/appointments', {
    params: {
      doctorId: params.doctorId,
      patientId: params.patientId,
      status: params.status?.toUpperCase(),
      from: params.from,
      to: params.to,
      page: params.page ?? 0,
      size: params.size ?? 20,
      sort: params.sort,
    },
  })

  return {
    ...response.data,
    content: await Promise.all(
      response.data.content.map(async (item) => getAppointmentById(item.id)),
    ),
  }
}

export async function getAppointmentById(id: string): Promise<AppointmentResponse> {
  const response = await apiClient.get<ApiAppointmentResponse>(`/appointments/${id}`)
  return enrichAppointment(response.data)
}

export async function createAppointment(
  data: AppointmentCreateRequest,
): Promise<AppointmentResponse> {
  const response = await apiClient.post<ApiAppointmentResponse>('/appointments', data)
  return enrichAppointment(response.data)
}

async function transitionStatus(
  id: string,
  endpoint: 'confirm' | 'start' | 'cancel' | 'no-show',
): Promise<AppointmentResponse> {
  const response = await apiClient.patch<ApiAppointmentResponse>(
    `/appointments/${id}/${endpoint}`,
  )
  return enrichAppointment(response.data)
}

export async function confirmAppointment(id: string): Promise<AppointmentResponse> {
  return transitionStatus(id, 'confirm')
}

export async function startAppointment(id: string): Promise<AppointmentResponse> {
  return transitionStatus(id, 'start')
}

export async function completeAppointment(
  id: string,
  data: MedicalRecordCreateRequest,
): Promise<AppointmentResponse> {
  const response = await apiClient.patch<ApiAppointmentResponse>(`/appointments/${id}/complete`, data)
  return enrichAppointment(response.data)
}

export async function cancelAppointment(id: string): Promise<AppointmentResponse> {
  return transitionStatus(id, 'cancel')
}

export async function noShowAppointment(id: string): Promise<AppointmentResponse> {
  return transitionStatus(id, 'no-show')
}

export async function getAvailability(
  doctorId: string,
  from: string,
  to: string,
): Promise<AppointmentSummaryResponse[]> {
  const response = await apiClient.get<AppointmentSummaryResponse[]>('/appointments/availability', {
    params: {
      doctorId,
      from,
      to,
    },
  })

  return response.data
}

export async function getMedicalRecordByAppointment(
  appointmentId: string,
): Promise<MedicalRecordResponse | null> {
  try {
    const response = await apiClient.get<MedicalRecordResponse>(
      `/medical-records/appointment/${appointmentId}`,
    )
    return response.data
  } catch {
    return null
  }
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
