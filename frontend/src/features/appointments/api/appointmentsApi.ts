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
  chiefComplaint: z.string().max(500, 'Máximo 500 caracteres').optional(),
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

export async function getAppointments(
  params: AppointmentsListParams = {},
): Promise<PageResponse<AppointmentSummaryResponse>> {
  const response = await apiClient.get<PageResponse<AppointmentSummaryResponse>>('/appointments', {
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

  return response.data
}

export async function getAppointmentById(id: string): Promise<AppointmentResponse> {
  const response = await apiClient.get<AppointmentResponse>(`/appointments/${id}`)
  return response.data
}

export async function createAppointment(
  data: AppointmentCreateRequest,
): Promise<AppointmentResponse> {
  const response = await apiClient.post<AppointmentResponse>('/appointments', data)
  return response.data
}

export async function confirmAppointment(id: string): Promise<AppointmentResponse> {
  const response = await apiClient.patch<AppointmentResponse>(`/appointments/${id}/confirm`)
  return response.data
}

export async function startAppointment(id: string): Promise<AppointmentResponse> {
  const response = await apiClient.patch<AppointmentResponse>(`/appointments/${id}/start`)
  return response.data
}

export async function completeAppointment(
  id: string,
  data: MedicalRecordCreateRequest,
): Promise<AppointmentResponse> {
  const response = await apiClient.patch<AppointmentResponse>(`/appointments/${id}/complete`, data)
  return response.data
}

export async function cancelAppointment(id: string): Promise<AppointmentResponse> {
  const response = await apiClient.patch<AppointmentResponse>(`/appointments/${id}/cancel`)
  return response.data
}

export async function noShowAppointment(id: string): Promise<AppointmentResponse> {
  const response = await apiClient.patch<AppointmentResponse>(`/appointments/${id}/no-show`)
  return response.data
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
    chiefComplaint: values.chiefComplaint && values.chiefComplaint.trim().length > 0 ? values.chiefComplaint.trim() : null,
    notes: values.notes && values.notes.trim().length > 0 ? values.notes.trim() : null,
  }
}
