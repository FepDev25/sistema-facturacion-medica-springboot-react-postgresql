import { z } from 'zod'
import { mockDelay, paginateArray } from '@/lib/mock-utils'
import { PATIENTS_MOCK } from '@/mocks'
import { APPOINTMENTS_MOCK } from '@/mocks/appointments.mock'
import { INSURANCE_POLICIES_MOCK } from '@/mocks/insurance-policies.mock'
import type { PageResponse } from '@/types/common'
import type { AppointmentSummaryResponse } from '@/types/appointment'
import type { InsurancePolicySummaryResponse } from '@/types/insurance'
import type {
  PatientCreateRequest,
  PatientResponse,
  PatientSummaryResponse,
  PatientUpdateRequest,
} from '@/types/patient'

const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const

const OptionalEmailSchema = z
  .union([
    z.literal(''),
    z.email('Email inválido').max(100, 'Máximo 100 caracteres'),
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

let patientsStore: PatientResponse[] = [...PATIENTS_MOCK]

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

function toNullable(value?: string): string | null {
  return value && value.trim().length > 0 ? value.trim() : null
}

function toSummary(patient: PatientResponse): PatientSummaryResponse {
  return {
    id: patient.id,
    dni: patient.dni,
    firstName: patient.firstName,
    lastName: patient.lastName,
    allergies: patient.allergies,
  }
}

export async function getPatients(
  params: PatientsListParams = {},
): Promise<PageResponse<PatientResponse>> {
  await mockDelay()

  const { lastName, page = 0, size = 20 } = params
  const query = lastName?.trim().toLowerCase()

  let items = [...patientsStore]
  if (query) {
    items = items.filter((patient) => patient.lastName.toLowerCase().includes(query))
  }

  items.sort((a, b) => a.lastName.localeCompare(b.lastName, 'es', { sensitivity: 'base' }))

  return paginateArray(items, page, size)
}

export async function createPatient(data: PatientCreateRequest): Promise<PatientResponse> {
  await mockDelay()

  const dniAlreadyExists = patientsStore.some((patient) => patient.dni === data.dni)
  if (dniAlreadyExists) {
    throw new Error('Ya existe un paciente con ese DNI')
  }

  const now = new Date().toISOString()
  const newItem: PatientResponse = {
    id: crypto.randomUUID(),
    dni: data.dni,
    firstName: data.firstName,
    lastName: data.lastName,
    birthDate: data.birthDate,
    gender: data.gender,
    phone: data.phone,
    email: data.email ?? null,
    address: data.address ?? null,
    bloodType: data.bloodType ?? null,
    allergies: data.allergies ?? null,
    createdAt: now,
    updatedAt: now,
  }

  patientsStore = [newItem, ...patientsStore]
  return newItem
}

export async function getPatientById(id: string): Promise<PatientResponse> {
  await mockDelay()

  const patient = patientsStore.find((item) => item.id === id)
  if (!patient) {
    throw new Error('Paciente no encontrado')
  }

  return patient
}

export async function updatePatient(
  id: string,
  data: PatientUpdateRequest,
): Promise<PatientResponse> {
  await mockDelay()

  const existing = patientsStore.find((patient) => patient.id === id)
  if (!existing) {
    throw new Error(`Paciente ${id} no encontrado`)
  }

  const updated: PatientResponse = {
    ...existing,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    email: data.email ?? null,
    address: data.address ?? null,
    allergies: data.allergies ?? null,
    updatedAt: new Date().toISOString(),
  }

  patientsStore = patientsStore.map((patient) => (patient.id === id ? updated : patient))
  return updated
}

export async function searchPatients(q: string): Promise<PatientSummaryResponse[]> {
  await mockDelay()

  const query = q.trim().toLowerCase()
  if (!query) {
    return []
  }

  return patientsStore
    .filter((patient) => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase()
      return (
        fullName.includes(query) ||
        patient.dni.toLowerCase().includes(query) ||
        patient.lastName.toLowerCase().includes(query)
      )
    })
    .slice(0, 10)
    .map(toSummary)
}

export async function getPatientAppointments(
  id: string,
  params: PatientAppointmentsParams = {},
): Promise<PageResponse<AppointmentSummaryResponse>> {
  await mockDelay()

  const { page = 0, size = 20 } = params
  const items = APPOINTMENTS_MOCK.filter((appointment) => appointment.patient.id === id)
    .map<AppointmentSummaryResponse>((appointment) => ({
      id: appointment.id,
      scheduledAt: appointment.scheduledAt,
      status: appointment.status,
      chiefComplaint: appointment.chiefComplaint,
    }))
    .sort(
      (a, b) =>
        new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
    )

  return paginateArray(items, page, size)
}

export async function getPatientPolicies(
  id: string,
  params: PatientPoliciesParams = {},
): Promise<PageResponse<InsurancePolicySummaryResponse>> {
  await mockDelay()

  const { onlyActive = false, page = 0, size = 20 } = params
  const items = INSURANCE_POLICIES_MOCK.filter((policy) => policy.patient.id === id)
    .filter((policy) => (onlyActive ? policy.isActive : true))
    .map<InsurancePolicySummaryResponse>((policy) => ({
      id: policy.id,
      policyNumber: policy.policyNumber,
      coveragePercentage: policy.coveragePercentage,
      providerName: policy.provider.name,
    }))

  return paginateArray(items, page, size)
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
    phone: values.phone.trim(),
    email: toNullable(values.email),
    address: toNullable(values.address),
    allergies: toNullable(values.allergies),
  }
}
