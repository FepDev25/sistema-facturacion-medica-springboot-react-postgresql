import { z } from 'zod'
import { mockDelay, paginateArray } from '@/lib/mock-utils'
import {
  INSURANCE_POLICIES_MOCK,
  INSURANCE_PROVIDERS_MOCK,
  PATIENTS_MOCK,
} from '@/mocks'
import type { PageResponse } from '@/types/common'
import type {
  InsurancePolicyCreateRequest,
  InsurancePolicyResponse,
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
})

export type ProviderFormValues = z.infer<typeof ProviderFormSchema>

export const PolicyFormSchema = z.object({
  patientId: z.string().min(1, 'Requerido'),
  providerId: z.string().min(1, 'Requerido'),
  policyNumber: z.string().min(1, 'Requerido').max(50, 'Maximo 50 caracteres'),
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
})

export type PolicyFormValues = z.infer<typeof PolicyFormSchema>

let providersStore: InsuranceProviderResponse[] = [...INSURANCE_PROVIDERS_MOCK]
let policiesStore: InsurancePolicyResponse[] = [...INSURANCE_POLICIES_MOCK]

export interface ProvidersListParams {
  active?: boolean
  page?: number
  size?: number
}

export interface PoliciesListParams {
  patientId?: string
  onlyActive?: boolean
  page?: number
  size?: number
}

function toNullable(value?: string): string | null {
  return value && value.trim().length > 0 ? value.trim() : null
}

export async function getProviders(
  params: ProvidersListParams = {},
): Promise<PageResponse<InsuranceProviderResponse>> {
  await mockDelay()

  const { active, page = 0, size = 20 } = params
  let items = [...providersStore]

  if (typeof active === 'boolean') {
    items = items.filter((provider) => provider.isActive === active)
  }

  items.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
  return paginateArray(items, page, size)
}

export async function createProvider(
  data: InsuranceProviderCreateRequest,
): Promise<InsuranceProviderResponse> {
  await mockDelay()

  const codeExists = providersStore.some((provider) => provider.code === data.code)
  if (codeExists) {
    throw new Error('Ya existe una aseguradora con ese codigo')
  }

  const newItem: InsuranceProviderResponse = {
    id: crypto.randomUUID(),
    name: data.name.trim(),
    code: data.code.trim(),
    phone: data.phone.trim(),
    email: data.email ?? null,
    address: data.address ?? null,
    isActive: true,
  }

  providersStore = [newItem, ...providersStore]
  return newItem
}

export async function updateProvider(
  id: string,
  data: InsuranceProviderUpdateRequest,
): Promise<InsuranceProviderResponse> {
  await mockDelay()

  const existing = providersStore.find((provider) => provider.id === id)
  if (!existing) {
    throw new Error('Aseguradora no encontrada')
  }

  const updated: InsuranceProviderResponse = {
    ...existing,
    name: data.name.trim(),
    phone: data.phone.trim(),
    email: data.email ?? null,
    address: data.address ?? null,
  }

  providersStore = providersStore.map((provider) => (provider.id === id ? updated : provider))
  policiesStore = policiesStore.map((policy) =>
    policy.provider.id === id
      ? {
          ...policy,
          provider: {
            ...policy.provider,
            name: updated.name,
            code: updated.code,
          },
        }
      : policy,
  )

  return updated
}

export async function deactivateProvider(id: string): Promise<InsuranceProviderResponse> {
  await mockDelay()

  const existing = providersStore.find((provider) => provider.id === id)
  if (!existing) {
    throw new Error('Aseguradora no encontrada')
  }

  const updated: InsuranceProviderResponse = {
    ...existing,
    isActive: false,
  }

  providersStore = providersStore.map((provider) => (provider.id === id ? updated : provider))
  return updated
}

export async function getPolicies(
  params: PoliciesListParams = {},
): Promise<PageResponse<InsurancePolicyResponse>> {
  await mockDelay()

  const { patientId, onlyActive = false, page = 0, size = 20 } = params

  let items = [...policiesStore]
  if (patientId) {
    items = items.filter((policy) => policy.patient.id === patientId)
  }
  if (onlyActive) {
    items = items.filter((policy) => policy.isActive)
  }

  items.sort((a, b) => b.startDate.localeCompare(a.startDate))
  return paginateArray(items, page, size)
}

export async function createPolicy(
  data: InsurancePolicyCreateRequest,
): Promise<InsurancePolicyResponse> {
  await mockDelay()

  const patient = PATIENTS_MOCK.find((item) => item.id === data.patientId)
  const provider = providersStore.find((item) => item.id === data.providerId)
  if (!patient || !provider) {
    throw new Error('Paciente o aseguradora invalida')
  }

  const numberExists = policiesStore.some((policy) => policy.policyNumber === data.policyNumber)
  if (numberExists) {
    throw new Error('Ya existe una poliza con ese numero')
  }

  const newItem: InsurancePolicyResponse = {
    id: crypto.randomUUID(),
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
    policyNumber: data.policyNumber.trim(),
    coveragePercentage: data.coveragePercentage,
    deductible: data.deductible,
    startDate: data.startDate,
    endDate: data.endDate,
    isActive: true,
  }

  policiesStore = [newItem, ...policiesStore]
  return newItem
}

export async function updatePolicy(
  id: string,
  data: InsurancePolicyCreateRequest,
): Promise<InsurancePolicyResponse> {
  await mockDelay()

  const existing = policiesStore.find((policy) => policy.id === id)
  if (!existing) {
    throw new Error('Poliza no encontrada')
  }

  const patient = PATIENTS_MOCK.find((item) => item.id === data.patientId)
  const provider = providersStore.find((item) => item.id === data.providerId)
  if (!patient || !provider) {
    throw new Error('Paciente o aseguradora invalida')
  }

  const updated: InsurancePolicyResponse = {
    ...existing,
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
    policyNumber: data.policyNumber.trim(),
    coveragePercentage: data.coveragePercentage,
    deductible: data.deductible,
    startDate: data.startDate,
    endDate: data.endDate,
  }

  policiesStore = policiesStore.map((policy) => (policy.id === id ? updated : policy))
  return updated
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
): InsuranceProviderUpdateRequest {
  return {
    name: values.name.trim(),
    phone: values.phone.trim(),
    email: toNullable(values.email),
    address: toNullable(values.address),
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
