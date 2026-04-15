import { z } from 'zod'
import { apiClient } from '@/lib/axios'
import type { PageResponse } from '@/types/common'
import type {
  InsurancePolicyCreateRequest,
  InsurancePolicyResponse,
  InsurancePolicyUpdateRequest,
  InsuranceProviderCreateRequest,
  InsuranceProviderResponse,
  InsuranceProviderUpdateRequest,
} from '@/types/insurance'

const OptionalEmailSchema = z
  .union([z.literal(''), z.string().email('Email invalido').max(100, 'Maximo 100 caracteres')])
  .optional()

const OptionalAddressSchema = z.string().max(200, 'Maximo 200 caracteres').optional()

export const ProviderFormSchema = z.object({
  name: z.string().min(1, 'Requerido').max(100, 'Maximo 100 caracteres'),
  code: z.string().min(1, 'Requerido').max(50, 'Maximo 50 caracteres'),
  phone: z.string().min(1, 'Requerido').max(20, 'Maximo 20 caracteres'),
  email: OptionalEmailSchema,
  address: OptionalAddressSchema,
  isActive: z.boolean(),
})

export type ProviderFormValues = z.infer<typeof ProviderFormSchema>

export const PolicyFormSchema = z
  .object({
    patientId: z.string().min(1, 'Requerido'),
    providerId: z.string().min(1, 'Requerido'),
    policyNumber: z.string().min(1, 'Requerido').max(100, 'Maximo 100 caracteres'),
    coveragePercentage: z
      .number({ message: 'Debe ser un numero' })
      .min(0, 'Minimo 0%')
      .max(100, 'Maximo 100%'),
    deductible: z.number({ message: 'Debe ser un numero' }).min(0, 'No puede ser negativo'),
    startDate: z
      .string()
      .min(1, 'Requerido')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato invalido (YYYY-MM-DD)'),
    endDate: z
      .string()
      .min(1, 'Requerido')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato invalido (YYYY-MM-DD)'),
    isActive: z.boolean(),
  })
  .refine((data) => {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      return false
    }
    return true
  }, { message: 'La fecha de fin debe ser posterior a la de inicio' })

export type PolicyFormValues = z.infer<typeof PolicyFormSchema>

export interface ProvidersListParams {
  active?: boolean
  page?: number
  size?: number
  sort?: string
}

export interface PoliciesListParams {
  patientId?: string
  onlyActive?: boolean
  page?: number
  size?: number
  sort?: string
}

function toNullable(value?: string): string | null {
  return value && value.trim().length > 0 ? value.trim() : null
}

interface ApiInsurancePolicyResponse {
  id: string
  patientId: string
  patientFirstName: string
  patientLastName: string
  providerId: string
  providerName: string
  policyNumber: string
  coveragePercentage: number
  deductible: number
  startDate: string
  endDate: string
  isActive: boolean
}

interface ApiPatientDetail {
  id: string
  dni: string
  firstName: string
  lastName: string
  allergies: string | null
}

interface ApiInsuranceProviderDetail {
  id: string
  name: string
  code: string
}

function mapPolicy(
  item: ApiInsurancePolicyResponse,
  patient: ApiPatientDetail,
  provider: ApiInsuranceProviderDetail,
): InsurancePolicyResponse {
  return {
    id: item.id,
    patient: {
      id: patient.id,
      dni: patient.dni,
      firstName: patient.firstName,
      lastName: patient.lastName,
      allergies: patient.allergies,
    },
    provider: {
      id: provider.id,
      name: provider.name,
      code: provider.code,
    },
    policyNumber: item.policyNumber,
    coveragePercentage: item.coveragePercentage,
    deductible: item.deductible,
    startDate: item.startDate,
    endDate: item.endDate,
    isActive: item.isActive,
  }
}

async function enrichPolicy(item: ApiInsurancePolicyResponse): Promise<InsurancePolicyResponse> {
  const [patientResponse, providerResponse] = await Promise.all([
    apiClient.get<ApiPatientDetail>(`/patients/${item.patientId}`),
    apiClient.get<ApiInsuranceProviderDetail>(`/insurance/providers/${item.providerId}`),
  ])

  return mapPolicy(item, patientResponse.data, providerResponse.data)
}

export async function getProviders(
  params: ProvidersListParams = {},
): Promise<PageResponse<InsuranceProviderResponse>> {
  const response = await apiClient.get<PageResponse<InsuranceProviderResponse>>('/insurance/providers', {
    params: {
      active: params.active,
      page: params.page ?? 0,
      size: params.size ?? 20,
      sort: params.sort,
    },
  })

  return response.data
}

export async function createProvider(
  data: InsuranceProviderCreateRequest,
): Promise<InsuranceProviderResponse> {
  const response = await apiClient.post<InsuranceProviderResponse>('/insurance/providers', data)
  return response.data
}

export async function updateProvider(
  id: string,
  data: InsuranceProviderUpdateRequest,
): Promise<InsuranceProviderResponse> {
  const response = await apiClient.put<InsuranceProviderResponse>(`/insurance/providers/${id}`, data)
  return response.data
}

export async function deactivateProvider(id: string): Promise<InsuranceProviderResponse> {
  await apiClient.delete(`/insurance/providers/${id}`)
  const response = await apiClient.get<InsuranceProviderResponse>(`/insurance/providers/${id}`)
  return response.data
}

export async function getPolicies(
  params: PoliciesListParams = {},
): Promise<PageResponse<InsurancePolicyResponse>> {
  const response = await apiClient.get<PageResponse<ApiInsurancePolicyResponse>>('/insurance/policies', {
    params: {
      patientId: params.patientId,
      onlyActive: params.onlyActive,
      page: params.page ?? 0,
      size: params.size ?? 20,
      sort: params.sort,
    },
  })

  return {
    ...response.data,
    content: await Promise.all(response.data.content.map((item) => enrichPolicy(item))),
  }
}

export async function createPolicy(
  data: InsurancePolicyCreateRequest,
): Promise<InsurancePolicyResponse> {
  const response = await apiClient.post<ApiInsurancePolicyResponse>('/insurance/policies', data)
  return enrichPolicy(response.data)
}

export async function updatePolicy(
  id: string,
  data: InsurancePolicyUpdateRequest,
): Promise<InsurancePolicyResponse> {
  const response = await apiClient.put<ApiInsurancePolicyResponse>(`/insurance/policies/${id}`, data)
  return enrichPolicy(response.data)
}

export function toProviderCreateRequest(
  values: ProviderFormValues,
): InsuranceProviderCreateRequest {
  return {
    name: values.name.trim(),
    code: values.code.trim(),
    phone: values.phone.trim(),
    email: toNullable(values.email),
    address: toNullable(values.address),
  }
}

export function toProviderUpdateRequest(
  values: ProviderFormValues,
  isActive: boolean,
): InsuranceProviderUpdateRequest {
  return {
    name: values.name.trim(),
    phone: values.phone.trim(),
    email: toNullable(values.email),
    address: toNullable(values.address),
    isActive,
  }
}

export function toPolicyUpdateRequest(
  values: PolicyFormValues,
  isActive: boolean,
): InsurancePolicyUpdateRequest {
  return {
    coveragePercentage: values.coveragePercentage,
    deductible: values.deductible,
    startDate: values.startDate,
    endDate: values.endDate,
    isActive,
  }
}

export function toPolicyRequest(values: PolicyFormValues): InsurancePolicyCreateRequest {
  return {
    patientId: values.patientId,
    providerId: values.providerId,
    policyNumber: values.policyNumber.trim(),
    coveragePercentage: values.coveragePercentage,
    deductible: values.deductible,
    startDate: values.startDate,
    endDate: values.endDate,
  }
}
