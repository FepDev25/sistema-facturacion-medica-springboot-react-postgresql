import { z } from 'zod'
import { apiClient } from '@/lib/axios'
import type { PageResponse } from '@/types/common'
import type {
  PatientCreateRequest,
  PatientResponse,
  PatientSummaryResponse,
  PatientUpdateRequest,
} from '@/types/patient'
import type { AppointmentSummaryResponse } from '@/types/appointment'
import type { InsurancePolicySummaryResponse } from '@/types/insurance'
import type { InvoiceListViewResponse } from '@/types/invoice'

const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const

const OptionalEmailSchema = z
  .union([
    z.literal(''),
    z.string().email('Email inválido').max(100, 'Máximo 100 caracteres'),
  ])
  .optional()

const OptionalAddressSchema = z
  .string()
  .max(200, 'Máximo 200 caracteres')
  .optional()

const OptionalBloodTypeSchema = z
  .string()
  .max(5, 'Máximo 5 caracteres')
  .optional()

const OptionalAllergiesSchema = z
  .string()
  .max(500, 'Máximo 500 caracteres')
  .optional()

export const PatientFormSchema = z.object({
  dni: z.string().min(1, 'Requerido').max(20, 'Máximo 20 caracteres'),
  firstName: z.string().min(1, 'Requerido').max(100, 'Máximo 100 caracteres'),
  lastName: z.string().min(1, 'Requerido').max(100, 'Máximo 100 caracteres'),
  birthDate: z
    .string()
    .min(1, 'Requerido')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato inválido (YYYY-MM-DD)'),
  gender: z.enum(GENDERS),
  phone: z.string().min(1, 'Requerido').max(20, 'Máximo 20 caracteres'),
  email: OptionalEmailSchema,
  address: OptionalAddressSchema,
  bloodType: OptionalBloodTypeSchema,
  allergies: OptionalAllergiesSchema,
})

export type PatientFormValues = z.infer<typeof PatientFormSchema>

export interface PatientsListParams {
  lastName?: string
  page?: number
  size?: number
  sort?: string
}

export interface PatientAppointmentsParams {
  page?: number
  size?: number
  sort?: string
}

export interface PatientPoliciesParams {
  onlyActive?: boolean
  page?: number
  size?: number
  sort?: string
}

export interface PatientInvoicesParams {
  status?: InvoiceListViewResponse['status']
  page?: number
  size?: number
  sort?: string
}

function toNullable(value?: string): string | null {
  return value && value.trim().length > 0 ? value.trim() : null
}

export async function getPatients(
  params: PatientsListParams = {},
): Promise<PageResponse<PatientSummaryResponse>> {
  const response = await apiClient.get<PageResponse<PatientSummaryResponse>>('/patients', {
    params: {
      lastName: params.lastName,
      page: params.page ?? 0,
      size: params.size ?? 20,
      sort: params.sort,
    },
  })

  return response.data
}

export async function getPatientById(id: string): Promise<PatientResponse> {
  const response = await apiClient.get<PatientResponse>(`/patients/${id}`)
  return response.data
}

export async function createPatient(data: PatientCreateRequest): Promise<PatientResponse> {
  const response = await apiClient.post<PatientResponse>('/patients', data)
  return response.data
}

export async function updatePatient(
  id: string,
  data: PatientUpdateRequest,
): Promise<PatientResponse> {
  const response = await apiClient.put<PatientResponse>(`/patients/${id}`, data)
  return response.data
}

export async function searchPatients(q: string): Promise<PatientSummaryResponse[]> {
  const response = await apiClient.get<PatientSummaryResponse[]>('/patients/search', {
    params: { q },
  })

  return response.data
}

export async function getPatientAppointments(
  id: string,
  params: PatientAppointmentsParams = {},
): Promise<PageResponse<AppointmentSummaryResponse>> {
  const response = await apiClient.get<PageResponse<AppointmentSummaryResponse>>(
    `/patients/${id}/appointments`,
    {
      params: {
        page: params.page ?? 0,
        size: params.size ?? 20,
        sort: params.sort,
      },
    },
  )

  return response.data
}

export async function getPatientPolicies(
  id: string,
  params: PatientPoliciesParams = {},
): Promise<PageResponse<InsurancePolicySummaryResponse>> {
  const response = await apiClient.get<PageResponse<InsurancePolicySummaryResponse>>(
    `/patients/${id}/policies`,
    {
      params: {
        onlyActive: params.onlyActive,
        page: params.page ?? 0,
        size: params.size ?? 20,
        sort: params.sort,
      },
    },
  )

  return response.data
}

export async function getPatientInvoices(
  id: string,
  params: PatientInvoicesParams = {},
): Promise<PageResponse<InvoiceListViewResponse>> {
  const response = await apiClient.get<PageResponse<InvoiceListViewResponse>>(
    `/patients/${id}/invoices`,
    {
      params: {
        status: params.status?.toUpperCase(),
        page: params.page ?? 0,
        size: params.size ?? 20,
        sort: params.sort,
      },
    },
  )

  return response.data
}

export function toPatientCreateRequest(values: PatientFormValues): PatientCreateRequest {
  return {
    dni: values.dni.trim(),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    birthDate: values.birthDate,
    gender: values.gender,
    phone: values.phone.trim(),
    email: toNullable(values.email),
    address: toNullable(values.address),
    bloodType: toNullable(values.bloodType),
    allergies: toNullable(values.allergies),
  }
}

export function toPatientUpdateRequest(values: PatientFormValues): PatientUpdateRequest {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    birthDate: values.birthDate,
    gender: values.gender,
    phone: values.phone.trim(),
    email: toNullable(values.email),
    address: toNullable(values.address),
    bloodType: toNullable(values.bloodType),
    allergies: toNullable(values.allergies),
  }
}
