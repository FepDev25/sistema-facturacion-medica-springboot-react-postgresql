import { z } from 'zod'
import { apiClient } from '@/lib/axios'
import type { PageResponse } from '@/types/common'
import type {
  DoctorCreateRequest,
  DoctorResponse,
  DoctorUpdateRequest,
} from '@/types/doctor'

export const DoctorFormSchema = z.object({
  licenseNumber: z.string().min(1, 'Requerido').max(50, 'Máximo 50 caracteres'),
  firstName: z.string().min(1, 'Requerido').max(100, 'Máximo 100 caracteres'),
  lastName: z.string().min(1, 'Requerido').max(100, 'Máximo 100 caracteres'),
  specialty: z.string().min(1, 'Requerido').max(100, 'Máximo 100 caracteres'),
  phone: z.string().min(1, 'Requerido').max(20, 'Máximo 20 caracteres'),
  email: z.string().min(1, 'Requerido').email('Email inválido').max(100, 'Máximo 100 caracteres'),
})

export type DoctorFormValues = z.infer<typeof DoctorFormSchema>

export interface DoctorsListParams {
  active?: boolean
  specialty?: string
  page?: number
  size?: number
  sort?: string
}

interface ApiDoctorSummaryResponse {
  id: string
  firstName: string
  lastName: string
  specialty: string
}

export async function getDoctors(
  params: DoctorsListParams = {},
): Promise<PageResponse<DoctorResponse>> {
  const response = await apiClient.get<PageResponse<ApiDoctorSummaryResponse>>('/doctors', {
    params: {
      active: params.active,
      specialty: params.specialty,
      page: params.page ?? 0,
      size: params.size ?? 20,
      sort: params.sort,
    },
  })

  const details = await Promise.all(response.data.content.map((item) => getDoctorById(item.id)))

  return {
    ...response.data,
    content: details,
  }
}

export async function getDoctorById(id: string): Promise<DoctorResponse> {
  const response = await apiClient.get<DoctorResponse>(`/doctors/${id}`)
  return response.data
}

export async function getDoctorByLicense(licenseNumber: string): Promise<DoctorResponse | null> {
  try {
    const response = await apiClient.get<DoctorResponse>(
      `/doctors/license/${encodeURIComponent(licenseNumber)}`,
    )
    return response.data
  } catch {
    return null
  }
}

export async function createDoctor(data: DoctorCreateRequest): Promise<DoctorResponse> {
  const response = await apiClient.post<DoctorResponse>('/doctors', data)
  return response.data
}

export async function updateDoctor(
  id: string,
  data: DoctorUpdateRequest,
): Promise<DoctorResponse> {
  const response = await apiClient.put<DoctorResponse>(`/doctors/${id}`, {
    ...data,
    isActive: true,
  })
  return response.data
}

export async function deactivateDoctor(id: string): Promise<DoctorResponse> {
  await apiClient.delete(`/doctors/${id}`)
  return getDoctorById(id)
}

export function toDoctorCreateRequest(values: DoctorFormValues): DoctorCreateRequest {
  return {
    licenseNumber: values.licenseNumber.trim(),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    specialty: values.specialty.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
  }
}

export function toDoctorUpdateRequest(values: DoctorFormValues): DoctorUpdateRequest {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    specialty: values.specialty.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
  }
}
