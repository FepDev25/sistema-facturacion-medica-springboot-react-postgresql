import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getDoctors,
  getDoctorById,
  getDoctorByLicense,
  createDoctor,
  updateDoctor,
  deactivateDoctor,
  getSystemUsers,
  toDoctorCreateRequest,
  toDoctorUpdateRequest,
} from '@/features/doctors/api/doctorsApi'
import type { DoctorFormValues } from '@/features/doctors/api/doctorsApi'

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
const mockDelete = vi.mocked(mockedClient.delete)

beforeEach(() => {
  vi.clearAllMocks()
})

const mockDoctor = {
  id: 'doc-1',
  licenseNumber: 'MED-12345',
  firstName: 'Maria',
  lastName: 'Garcia',
  specialty: 'Cardiologia',
  phone: '555-9876',
  email: 'maria@test.com',
  isActive: true,
  userId: 'user-1',
  username: 'mgarcia',
  createdAt: '2025-01-01T00:00:00Z',
}

describe('doctors API', () => {
  describe('getDoctors', () => {
    it('fetches paginated doctors with default params', async () => {
      mockGet.mockResolvedValue({
        data: { content: [mockDoctor], totalElements: 1, totalPages: 1, number: 0, size: 20, first: true, last: true, empty: false },
      })
      const result = await getDoctors()
      expect(mockGet).toHaveBeenCalledWith('/doctors', {
        params: { active: undefined, specialty: undefined, page: 0, size: 20, sort: undefined },
      })
      expect(result.content).toHaveLength(1)
    })

    it('passes active and specialty filters', async () => {
      mockGet.mockResolvedValue({ data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20, first: true, last: true, empty: true } })
      await getDoctors({ active: true, specialty: 'Cardiologia' })
      expect(mockGet).toHaveBeenCalledWith('/doctors', {
        params: { active: true, specialty: 'Cardiologia', page: 0, size: 20, sort: undefined },
      })
    })
  })

  describe('getDoctorById', () => {
    it('fetches doctor by id', async () => {
      mockGet.mockResolvedValue({ data: mockDoctor })
      const result = await getDoctorById('doc-1')
      expect(mockGet).toHaveBeenCalledWith('/doctors/doc-1')
      expect(result.firstName).toBe('Maria')
    })
  })

  describe('getDoctorByLicense', () => {
    it('fetches doctor by license number', async () => {
      mockGet.mockResolvedValue({ data: mockDoctor })
      const result = await getDoctorByLicense('MED-12345')
      expect(mockGet).toHaveBeenCalledWith('/doctors/license/MED-12345')
      expect(result?.firstName).toBe('Maria')
    })

    it('encodes special characters in license', async () => {
      mockGet.mockResolvedValue({ data: mockDoctor })
      await getDoctorByLicense('MED/123')
      expect(mockGet).toHaveBeenCalledWith('/doctors/license/MED%2F123')
    })

    it('returns null on error', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))
      const result = await getDoctorByLicense('INVALID')
      expect(result).toBeNull()
    })
  })

  describe('createDoctor', () => {
    it('posts doctor data', async () => {
      mockPost.mockResolvedValue({ data: mockDoctor })
      const result = await createDoctor({
        licenseNumber: 'MED-12345',
        firstName: 'Maria',
        lastName: 'Garcia',
        specialty: 'Cardiologia',
        phone: '555-9876',
        email: 'maria@test.com',
      })
      expect(mockPost).toHaveBeenCalledWith('/doctors', expect.objectContaining({ licenseNumber: 'MED-12345' }))
      expect(result.id).toBe('doc-1')
    })
  })

  describe('updateDoctor', () => {
    it('puts doctor data', async () => {
      mockPut.mockResolvedValue({ data: mockDoctor })
      const result = await updateDoctor('doc-1', { firstName: 'Maria', lastName: 'Garcia', specialty: 'Cardiologia', phone: '555-9876', email: 'maria@test.com', isActive: true })
      expect(mockPut).toHaveBeenCalledWith('/doctors/doc-1', expect.objectContaining({ firstName: 'Maria' }))
      expect(result.id).toBe('doc-1')
    })
  })

  describe('deactivateDoctor', () => {
    it('deletes then refetches the doctor', async () => {
      mockDelete.mockResolvedValue({ data: undefined })
      mockGet.mockResolvedValue({ data: mockDoctor })
      const result = await deactivateDoctor('doc-1')
      expect(mockDelete).toHaveBeenCalledWith('/doctors/doc-1')
      expect(mockGet).toHaveBeenCalledWith('/doctors/doc-1')
      expect(result.id).toBe('doc-1')
    })
  })

  describe('getSystemUsers', () => {
    it('fetches system users with default params', async () => {
      mockGet.mockResolvedValue({
        data: { content: [{ id: 'u-1', username: 'admin', email: 'a@b.com', role: 'ADMIN', active: true }], totalElements: 1, totalPages: 1, number: 0, size: 100, first: true, last: true, empty: false },
      })
      const result = await getSystemUsers()
      expect(mockGet).toHaveBeenCalledWith('/system-users', {
        params: { role: undefined, active: undefined, page: 0, size: 100 },
      })
      expect(result.content).toHaveLength(1)
    })

    it('passes role filter', async () => {
      mockGet.mockResolvedValue({ data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 100, first: true, last: true, empty: true } })
      await getSystemUsers({ role: 'DOCTOR' })
      expect(mockGet).toHaveBeenCalledWith('/system-users', {
        params: { role: 'DOCTOR', active: undefined, page: 0, size: 100 },
      })
    })
  })
})

describe('doctor adapters', () => {
  describe('toDoctorCreateRequest', () => {
    it('trims strings and keeps userId when present', () => {
      const values: DoctorFormValues = {
        licenseNumber: ' MED-123 ', firstName: ' Maria ', lastName: ' Garcia ',
        specialty: ' Cardiologia ', phone: ' 555-1234 ', email: ' maria@test.com ',
        isActive: true, userId: 'user-1',
      }
      const result = toDoctorCreateRequest(values)
      expect(result.licenseNumber).toBe('MED-123')
      expect(result.userId).toBe('user-1')
    })

    it('nullifies empty userId', () => {
      const values: DoctorFormValues = {
        licenseNumber: 'MED-123', firstName: 'Maria', lastName: 'Garcia',
        specialty: 'Cardio', phone: '555', email: 'm@t.com', isActive: true, userId: '',
      }
      const result = toDoctorCreateRequest(values)
      expect(result.userId).toBeNull()
    })

    it('nullifies whitespace-only userId', () => {
      const values: DoctorFormValues = {
        licenseNumber: 'MED-123', firstName: 'Maria', lastName: 'Garcia',
        specialty: 'Cardio', phone: '555', email: 'm@t.com', isActive: true, userId: '   ',
      }
      const result = toDoctorCreateRequest(values)
      expect(result.userId).toBeNull()
    })
  })

  describe('toDoctorUpdateRequest', () => {
    it('excludes licenseNumber and userId', () => {
      const values: DoctorFormValues = {
        licenseNumber: 'MED-123', firstName: ' Maria ', lastName: ' Garcia ',
        specialty: ' Cardio ', phone: ' 555 ', email: ' m@t.com ', isActive: true, userId: 'user-1',
      }
      const result = toDoctorUpdateRequest(values, false)
      expect(result.licenseNumber).toBeUndefined()
      expect(result.userId).toBeUndefined()
      expect(result.isActive).toBe(false)
    })
  })
})
