import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  searchPatients,
  getPatientAppointments,
  getPatientPolicies,
  getPatientInvoices,
  toPatientCreateRequest,
  toPatientUpdateRequest,
} from '@/features/patients/api/patientsApi'
import type { PatientFormValues } from '@/features/patients/api/patientsApi'
import type { PatientResponse, PatientSummaryResponse } from '@/types/patient'
import type { PageResponse } from '@/types/common'

vi.mock('@/lib/axios', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: { headers: { common: {} } },
  },
}))

import { apiClient as mockedClient } from '@/lib/axios'

const mockGet = vi.mocked(mockedClient.get)
const mockPost = vi.mocked(mockedClient.post)
const mockPut = vi.mocked(mockedClient.put)

beforeEach(() => {
  vi.clearAllMocks()
})

const mockPatientSummary: PatientSummaryResponse = {
  id: 'p-1',
  dni: '12345678',
  firstName: 'Juan',
  lastName: 'Perez',
  phone: '555-1234',
}

const mockPatient: PatientResponse = {
  id: 'p-1',
  dni: '12345678',
  firstName: 'Juan',
  lastName: 'Perez',
  birthDate: '1990-05-15',
  gender: 'male',
  phone: '555-1234',
  email: 'juan@test.com',
  address: 'Calle 123',
  bloodType: 'O+',
  allergies: 'Penicilina',
  active: true,
  createdAt: '2025-01-01T00:00:00Z',
}

describe('patients API', () => {
  describe('getPatients', () => {
    it('fetches paginated patients with default params', async () => {
      const page: PageResponse<PatientSummaryResponse> = {
        content: [mockPatientSummary],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20,
        first: true,
        last: true,
        empty: false,
      }
      mockGet.mockResolvedValue({ data: page })
      const result = await getPatients()
      expect(mockGet).toHaveBeenCalledWith('/patients', {
        params: { lastName: undefined, page: 0, size: 20, sort: undefined },
      })
      expect(result.content).toHaveLength(1)
    })

    it('passes filter params correctly', async () => {
      const page: PageResponse<PatientSummaryResponse> = {
        content: [], totalElements: 0, totalPages: 0, number: 0, size: 20, first: true, last: true, empty: true,
      }
      mockGet.mockResolvedValue({ data: page })
      await getPatients({ lastName: 'Garcia', page: 1, size: 50, sort: 'name' })
      expect(mockGet).toHaveBeenCalledWith('/patients', {
        params: { lastName: 'Garcia', page: 1, size: 50, sort: 'name' },
      })
    })
  })

  describe('getPatientById', () => {
    it('fetches single patient by id', async () => {
      mockGet.mockResolvedValue({ data: mockPatient })
      const result = await getPatientById('p-1')
      expect(mockGet).toHaveBeenCalledWith('/patients/p-1')
      expect(result.firstName).toBe('Juan')
    })
  })

  describe('createPatient', () => {
    it('posts patient data and returns created patient', async () => {
      mockPost.mockResolvedValue({ data: mockPatient })
      const result = await createPatient({
        dni: '12345678',
        firstName: 'Juan',
        lastName: 'Perez',
        birthDate: '1990-05-15',
        gender: 'male',
        phone: '555-1234',
      })
      expect(mockPost).toHaveBeenCalledWith('/patients', expect.objectContaining({ dni: '12345678' }))
      expect(result.id).toBe('p-1')
    })
  })

  describe('updatePatient', () => {
    it('puts patient data and returns updated patient', async () => {
      mockPut.mockResolvedValue({ data: mockPatient })
      const result = await updatePatient('p-1', { firstName: 'Juan', lastName: 'Perez', birthDate: '1990-05-15', gender: 'male', phone: '555-1234' })
      expect(mockPut).toHaveBeenCalledWith('/patients/p-1', expect.objectContaining({ firstName: 'Juan' }))
      expect(result.id).toBe('p-1')
    })
  })

  describe('searchPatients', () => {
    it('fetches patients by search query', async () => {
      mockGet.mockResolvedValue({ data: [mockPatientSummary] })
      const result = await searchPatients('Juan')
      expect(mockGet).toHaveBeenCalledWith('/patients/search', { params: { q: 'Juan' } })
      expect(result).toHaveLength(1)
    })
  })

  describe('getPatientAppointments', () => {
    it('fetches patient appointments with pagination', async () => {
      mockGet.mockResolvedValue({ data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20, first: true, last: true, empty: true } })
      await getPatientAppointments('p-1', { page: 0, size: 10 })
      expect(mockGet).toHaveBeenCalledWith('/patients/p-1/appointments', {
        params: { page: 0, size: 10, sort: undefined },
      })
    })
  })

  describe('getPatientPolicies', () => {
    it('fetches patient policies with onlyActive filter', async () => {
      mockGet.mockResolvedValue({ data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20, first: true, last: true, empty: true } })
      await getPatientPolicies('p-1', { onlyActive: true })
      expect(mockGet).toHaveBeenCalledWith('/patients/p-1/policies', {
        params: { onlyActive: true, page: 0, size: 20, sort: undefined },
      })
    })
  })

  describe('getPatientInvoices', () => {
    it('uppercases status filter', async () => {
      mockGet.mockResolvedValue({ data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20, first: true, last: true, empty: true } })
      await getPatientInvoices('p-1', { status: 'paid' })
      expect(mockGet).toHaveBeenCalledWith('/patients/p-1/invoices', {
        params: expect.objectContaining({ status: 'PAID' }),
      })
    })
  })
})

describe('patient adapters', () => {
  const formValues: PatientFormValues = {
    dni: ' 12345678 ',
    firstName: ' Juan ',
    lastName: ' Perez ',
    birthDate: '1990-05-15',
    gender: 'male',
    phone: ' 555-1234 ',
    email: ' juan@test.com ',
    address: ' Calle 123 ',
    bloodType: 'O+',
    allergies: 'Penicilina',
  }

  describe('toPatientCreateRequest', () => {
    it('trims strings and converts empty optionals to null', () => {
      const result = toPatientCreateRequest(formValues)
      expect(result.dni).toBe('12345678')
      expect(result.firstName).toBe('Juan')
      expect(result.email).toBe('juan@test.com')
      expect(result.address).toBe('Calle 123')
      expect(result.bloodType).toBe('O+')
      expect(result.allergies).toBe('Penicilina')
    })

    it('converts empty optional strings to null', () => {
      const emptyValues: PatientFormValues = {
        dni: '12345678', firstName: 'Juan', lastName: 'Perez',
        birthDate: '1990-05-15', gender: 'male', phone: '555-1234',
      }
      const result = toPatientCreateRequest(emptyValues)
      expect(result.email).toBeNull()
      expect(result.address).toBeNull()
      expect(result.bloodType).toBeNull()
      expect(result.allergies).toBeNull()
    })

    it('converts whitespace-only optionals to null', () => {
      const wsValues: PatientFormValues = {
        dni: '12345678', firstName: 'Juan', lastName: 'Perez',
        birthDate: '1990-05-15', gender: 'male', phone: '555-1234',
        email: '   ', address: '  ', bloodType: '  ', allergies: '  ',
      }
      const result = toPatientCreateRequest(wsValues)
      expect(result.email).toBeNull()
      expect(result.address).toBeNull()
    })
  })

  describe('toPatientUpdateRequest', () => {
    it('trims strings but does not include dni', () => {
      const result = toPatientUpdateRequest(formValues)
      expect(result.dni).toBeUndefined()
      expect(result.firstName).toBe('Juan')
      expect(result.lastName).toBe('Perez')
    })
  })
})
