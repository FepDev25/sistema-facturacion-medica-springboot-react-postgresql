import { z } from 'zod'
import { mockDelay, paginateArray } from '@/lib/mock-utils'
import { DOCTORS_MOCK } from '@/mocks'
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

let doctorsStore: DoctorResponse[] = [...DOCTORS_MOCK]

export interface DoctorsListParams {
  active?: boolean
  specialty?: string
  page?: number
  size?: number
  sort?: string
}

export async function getDoctors(
  params: DoctorsListParams = {},
): Promise<PageResponse<DoctorResponse>> {
  await mockDelay()

  const { active, specialty, page = 0, size = 20 } = params
  const specialtyQuery = specialty?.trim().toLowerCase()

  let items = [...doctorsStore]
  if (typeof active === 'boolean') {
    items = items.filter((doctor) => doctor.isActive === active)
  }
  if (specialtyQuery) {
    items = items.filter((doctor) => doctor.specialty.toLowerCase().includes(specialtyQuery))
  }

  items.sort((a, b) => a.lastName.localeCompare(b.lastName, 'es', { sensitivity: 'base' }))

  return paginateArray(items, page, size)
}

export async function createDoctor(data: DoctorCreateRequest): Promise<DoctorResponse> {
  await mockDelay()

  const licenseExists = doctorsStore.some((doctor) => doctor.licenseNumber === data.licenseNumber)
  if (licenseExists) {
    throw new Error('Ya existe un médico con ese número de licencia')
  }

  const now = new Date().toISOString()
  const newItem: DoctorResponse = {
    id: crypto.randomUUID(),
    licenseNumber: data.licenseNumber.trim(),
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    specialty: data.specialty.trim(),
    phone: data.phone.trim(),
    email: data.email.trim(),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }

  doctorsStore = [newItem, ...doctorsStore]
  return newItem
}

export async function updateDoctor(
  id: string,
  data: DoctorUpdateRequest,
): Promise<DoctorResponse> {
  await mockDelay()

  const existing = doctorsStore.find((doctor) => doctor.id === id)
  if (!existing) {
    throw new Error(`Médico ${id} no encontrado`)
  }

  const updated: DoctorResponse = {
    ...existing,
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    specialty: data.specialty.trim(),
    phone: data.phone.trim(),
    email: data.email.trim(),
    updatedAt: new Date().toISOString(),
  }

  doctorsStore = doctorsStore.map((doctor) => (doctor.id === id ? updated : doctor))
  return updated
}

export async function deactivateDoctor(id: string): Promise<DoctorResponse> {
  await mockDelay()

  const existing = doctorsStore.find((doctor) => doctor.id === id)
  if (!existing) {
    throw new Error(`Médico ${id} no encontrado`)
  }

  if (!existing.isActive) {
    return existing
  }

  const updated: DoctorResponse = {
    ...existing,
    isActive: false,
    updatedAt: new Date().toISOString(),
  }

  doctorsStore = doctorsStore.map((doctor) => (doctor.id === id ? updated : doctor))
  return updated
}

export function toDoctorCreateRequest(values: DoctorFormValues): DoctorCreateRequest {
  return {
    licenseNumber: values.licenseNumber,
    firstName: values.firstName,
    lastName: values.lastName,
    specialty: values.specialty,
    phone: values.phone,
    email: values.email,
  }
}

export function toDoctorUpdateRequest(values: DoctorFormValues): DoctorUpdateRequest {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    specialty: values.specialty,
    phone: values.phone,
    email: values.email,
  }
}
