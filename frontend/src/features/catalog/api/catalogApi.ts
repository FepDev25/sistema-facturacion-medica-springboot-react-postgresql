import { z } from 'zod'
import { mockDelay, paginateArray } from '@/lib/mock-utils'
import { SERVICES_MOCK, MEDICATIONS_MOCK } from '@/mocks'
import type {
  ServiceResponse,
  ServiceCreateRequest,
  ServiceUpdateRequest,
  MedicationResponse,
  MedicationCreateRequest,
  MedicationUpdateRequest,
} from '@/types/catalog'
import type { PageResponse } from '@/types/common'

// Zod Schemas

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

// en memoria

let servicesStore: ServiceResponse[] = [...SERVICES_MOCK]
let medicationsStore: MedicationResponse[] = [...MEDICATIONS_MOCK]

// api services

export interface CatalogListParams {
  page?: number
  size?: number
  includeInactive?: boolean
}

export async function getServices(
  params: CatalogListParams = {},
): Promise<PageResponse<ServiceResponse>> {
  await mockDelay()
  const { page = 0, size = 100, includeInactive = true } = params
  const items = includeInactive ? servicesStore : servicesStore.filter((s) => s.isActive)
  return paginateArray(items, page, size)
}

export async function createService(data: ServiceCreateRequest): Promise<ServiceResponse> {
  await mockDelay()
  const newItem: ServiceResponse = {
    id: crypto.randomUUID(),
    code: data.code,
    name: data.name,
    description: data.description ?? null,
    price: data.price,
    category: data.category,
    isActive: true,
  }
  servicesStore = [newItem, ...servicesStore]
  return newItem
}

export async function updateService(
  id: string,
  data: ServiceUpdateRequest,
): Promise<ServiceResponse> {
  await mockDelay()
  const existing = servicesStore.find((s) => s.id === id)
  if (!existing) throw new Error(`Servicio ${id} no encontrado`)
  const updated: ServiceResponse = {
    ...existing,
    name: data.name,
    description: data.description ?? null,
    price: data.price,
    category: data.category,
  }
  servicesStore = servicesStore.map((s) => (s.id === id ? updated : s))
  return updated
}

export async function toggleServiceActive(id: string): Promise<ServiceResponse> {
  await mockDelay()
  const existing = servicesStore.find((s) => s.id === id)
  if (!existing) throw new Error(`Servicio ${id} no encontrado`)
  const updated = { ...existing, isActive: !existing.isActive }
  servicesStore = servicesStore.map((s) => (s.id === id ? updated : s))
  return updated
}

// api medications

export async function getMedications(
  params: CatalogListParams = {},
): Promise<PageResponse<MedicationResponse>> {
  await mockDelay()
  const { page = 0, size = 100, includeInactive = true } = params
  const items = includeInactive
    ? medicationsStore
    : medicationsStore.filter((m) => m.isActive)
  return paginateArray(items, page, size)
}

export async function createMedication(
  data: MedicationCreateRequest,
): Promise<MedicationResponse> {
  await mockDelay()
  const newItem: MedicationResponse = {
    id: crypto.randomUUID(),
    code: data.code,
    name: data.name,
    description: data.description ?? null,
    price: data.price,
    unit: data.unit,
    requiresPrescription: data.requiresPrescription,
    isActive: true,
  }
  medicationsStore = [newItem, ...medicationsStore]
  return newItem
}

export async function updateMedication(
  id: string,
  data: MedicationUpdateRequest,
): Promise<MedicationResponse> {
  await mockDelay()
  const existing = medicationsStore.find((m) => m.id === id)
  if (!existing) throw new Error(`Medicamento ${id} no encontrado`)
  const updated: MedicationResponse = {
    ...existing,
    name: data.name,
    description: data.description ?? null,
    price: data.price,
    unit: data.unit,
    requiresPrescription: data.requiresPrescription,
  }
  medicationsStore = medicationsStore.map((m) => (m.id === id ? updated : m))
  return updated
}

export async function toggleMedicationActive(id: string): Promise<MedicationResponse> {
  await mockDelay()
  const existing = medicationsStore.find((m) => m.id === id)
  if (!existing) throw new Error(`Medicamento ${id} no encontrado`)
  const updated = { ...existing, isActive: !existing.isActive }
  medicationsStore = medicationsStore.map((m) => (m.id === id ? updated : m))
  return updated
}
