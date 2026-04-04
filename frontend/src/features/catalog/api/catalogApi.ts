import { z } from 'zod'
import { apiClient } from '@/lib/axios'
import type {
  ServiceResponse,
  ServiceCreateRequest,
  ServiceUpdateRequest,
  MedicationResponse,
  MedicationCreateRequest,
  MedicationUpdateRequest,
} from '@/types/catalog'
import type { PageResponse } from '@/types/common'

const SERVICE_CATEGORIES = [
  'consultation',
  'laboratory',
  'imaging',
  'surgery',
  'therapy',
  'emergency',
  'other',
] as const

const MEDICATION_UNITS = [
  'tablet',
  'capsule',
  'ml',
  'mg',
  'g',
  'unit',
  'box',
  'vial',
  'inhaler',
] as const

export const ServiceFormSchema = z.object({
  code: z.string().min(1, 'Requerido').max(50, 'Máximo 50 caracteres'),
  name: z.string().min(1, 'Requerido').max(200, 'Máximo 200 caracteres'),
  description: z.string().max(500, 'Máximo 500 caracteres').optional(),
  price: z.number({ message: 'Debe ser un número' }).min(0, 'No puede ser negativo'),
  category: z.enum(SERVICE_CATEGORIES),
})

export type ServiceFormValues = z.infer<typeof ServiceFormSchema>

export const MedicationFormSchema = z.object({
  code: z.string().min(1, 'Requerido').max(50, 'Máximo 50 caracteres'),
  name: z.string().min(1, 'Requerido').max(200, 'Máximo 200 caracteres'),
  description: z.string().max(500, 'Máximo 500 caracteres').optional(),
  price: z.number({ message: 'Debe ser un número' }).min(0, 'No puede ser negativo'),
  unit: z.enum(MEDICATION_UNITS),
  requiresPrescription: z.boolean(),
})

export type MedicationFormValues = z.infer<typeof MedicationFormSchema>

export interface CatalogListParams {
  page?: number
  size?: number
  includeInactive?: boolean
}

interface ApiServiceSummary {
  id: string
  code: string
  name: string
  price: number
  category: ServiceResponse['category']
  isActive: boolean
}

interface ApiMedicationSummary {
  id: string
  code: string
  name: string
  price: number
  unit: MedicationResponse['unit']
}

function toServiceCategoryParam(category?: ServiceResponse['category']) {
  return category ? category.toUpperCase() : undefined
}

export async function getServices(
  params: CatalogListParams = {},
): Promise<PageResponse<ServiceResponse>> {
  const response = await apiClient.get<PageResponse<ApiServiceSummary>>('/catalog/services', {
    params: {
      active: params.includeInactive ? undefined : true,
      page: params.page ?? 0,
      size: params.size ?? 100,
    },
  })

  const details = await Promise.all(response.data.content.map((item) => getServiceById(item.id)))

  return {
    ...response.data,
    content: details,
  }
}

export async function getServiceById(id: string): Promise<ServiceResponse> {
  const response = await apiClient.get<ServiceResponse>(`/catalog/services/${id}`)
  return response.data
}

export async function createService(data: ServiceCreateRequest): Promise<ServiceResponse> {
  const response = await apiClient.post<ServiceResponse>('/catalog/services', data)
  return response.data
}

export async function updateService(
  id: string,
  data: ServiceUpdateRequest,
): Promise<ServiceResponse> {
  const existing = await getServiceById(id)
  const response = await apiClient.put<ServiceResponse>(`/catalog/services/${id}`, {
    ...data,
    isActive: existing.isActive,
  })
  return response.data
}

export async function toggleServiceActive(id: string): Promise<ServiceResponse> {
  await apiClient.delete(`/catalog/services/${id}`)
  return getServiceById(id)
}

export async function getMedications(
  params: CatalogListParams = {},
): Promise<PageResponse<MedicationResponse>> {
  const response = await apiClient.get<PageResponse<ApiMedicationSummary>>('/catalog/medications', {
    params: {
      active: params.includeInactive ? undefined : true,
      page: params.page ?? 0,
      size: params.size ?? 100,
    },
  })

  const details = await Promise.all(
    response.data.content.map((item) => getMedicationById(item.id)),
  )

  return {
    ...response.data,
    content: details,
  }
}

export async function getMedicationById(id: string): Promise<MedicationResponse> {
  const response = await apiClient.get<MedicationResponse>(`/catalog/medications/${id}`)
  return response.data
}

export async function createMedication(
  data: MedicationCreateRequest,
): Promise<MedicationResponse> {
  const response = await apiClient.post<MedicationResponse>('/catalog/medications', data)
  return response.data
}

export async function updateMedication(
  id: string,
  data: MedicationUpdateRequest,
): Promise<MedicationResponse> {
  const existing = await getMedicationById(id)
  const response = await apiClient.put<MedicationResponse>(`/catalog/medications/${id}`, {
    ...data,
    isActive: existing.isActive,
  })
  return response.data
}

export async function toggleMedicationActive(id: string): Promise<MedicationResponse> {
  await apiClient.delete(`/catalog/medications/${id}`)
  return getMedicationById(id)
}

export async function searchServicesByName(q: string) {
  const response = await apiClient.get<ApiServiceSummary[]>('/catalog/services/search', {
    params: { q },
  })
  return response.data
}

export async function listFilteredServices(params: {
  category?: ServiceResponse['category']
  active?: boolean
  page?: number
  size?: number
}) {
  const response = await apiClient.get<PageResponse<ApiServiceSummary>>('/catalog/services', {
    params: {
      category: toServiceCategoryParam(params.category),
      active: params.active,
      page: params.page ?? 0,
      size: params.size ?? 20,
    },
  })
  return response.data
}

export async function listFilteredMedications(params: {
  active?: boolean
  unit?: MedicationResponse['unit']
  requiresPrescription?: boolean
  q?: string
  page?: number
  size?: number
}) {
  const response = await apiClient.get<PageResponse<ApiMedicationSummary>>('/catalog/medications', {
    params: {
      active: params.active,
      unit: params.unit,
      requiresPrescription: params.requiresPrescription,
      q: params.q,
      page: params.page ?? 0,
      size: params.size ?? 20,
    },
  })
  return response.data
}
