import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getServices,
  getServiceById,
  createService,
  updateService,
  toggleServiceActive,
  getMedications,
  getMedicationById,
  createMedication,
  updateMedication,
  toggleMedicationActive,
  searchServicesByName,
} from '@/features/catalog/api/catalogApi'

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

const mockService = {
  id: 'svc-1', code: 'C-001', name: 'Consulta General', description: 'Consulta de medicina general',
  price: 500, category: 'consultation' as const, isActive: true, createdAt: '2025-01-01T00:00:00Z',
}

const mockMedication = {
  id: 'med-1', code: 'M-001', name: 'Ibuprofeno 400mg', description: 'Antiinflamatorio',
  price: 50, unit: 'tablet' as const, requiresPrescription: true, isActive: true, createdAt: '2025-01-01T00:00:00Z',
}

describe('catalog API - services', () => {
  describe('getServices', () => {
    it('fetches services and enriches each by id', async () => {
      const summary = { id: 'svc-1', code: 'C-001', name: 'Consulta', price: 500, category: 'consultation' as const, isActive: true }
      mockGet.mockResolvedValueOnce({
        data: { content: [summary], totalElements: 1, totalPages: 1, number: 0, size: 100, first: true, last: true, empty: false },
      }).mockResolvedValueOnce({ data: mockService })

      const result = await getServices()
      expect(mockGet).toHaveBeenCalledTimes(2)
      expect(result.content).toHaveLength(1)
      expect(result.content[0].description).toBe('Consulta de medicina general')
    })

    it('passes active=true when includeInactive is not set', async () => {
      mockGet.mockResolvedValue({ data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 100, first: true, last: true, empty: true } })
      await getServices()
      expect(mockGet).toHaveBeenCalledWith('/catalog/services', {
        params: expect.objectContaining({ active: true }),
      })
    })

    it('does not pass active filter when includeInactive is true', async () => {
      mockGet.mockResolvedValue({ data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 100, first: true, last: true, empty: true } })
      await getServices({ includeInactive: true })
      expect(mockGet).toHaveBeenCalledWith('/catalog/services', {
        params: expect.objectContaining({ active: undefined }),
      })
    })
  })

  describe('getServiceById', () => {
    it('fetches service by id', async () => {
      mockGet.mockResolvedValue({ data: mockService })
      const result = await getServiceById('svc-1')
      expect(mockGet).toHaveBeenCalledWith('/catalog/services/svc-1')
      expect(result.name).toBe('Consulta General')
    })
  })

  describe('createService', () => {
    it('posts service data', async () => {
      mockPost.mockResolvedValue({ data: mockService })
      const result = await createService({ code: 'C-001', name: 'Consulta General', price: 500, category: 'consultation', isActive: true })
      expect(mockPost).toHaveBeenCalledWith('/catalog/services', expect.objectContaining({ code: 'C-001' }))
      expect(result.id).toBe('svc-1')
    })
  })

  describe('updateService', () => {
    it('puts service data', async () => {
      mockPut.mockResolvedValue({ data: mockService })
      await updateService('svc-1', { code: 'C-001', name: 'Consulta General', price: 500, category: 'consultation', isActive: true })
      expect(mockPut).toHaveBeenCalledWith('/catalog/services/svc-1', expect.any(Object))
    })
  })

  describe('toggleServiceActive', () => {
    it('deletes then refetches', async () => {
      mockDelete.mockResolvedValue({ data: undefined })
      mockGet.mockResolvedValue({ data: mockService })
      const result = await toggleServiceActive('svc-1')
      expect(mockDelete).toHaveBeenCalledWith('/catalog/services/svc-1')
      expect(mockGet).toHaveBeenCalledWith('/catalog/services/svc-1')
      expect(result.id).toBe('svc-1')
    })
  })
})

describe('catalog API - medications', () => {
  describe('getMedications', () => {
    it('fetches medications and enriches each by id', async () => {
      const summary = { id: 'med-1', code: 'M-001', name: 'Ibuprofeno', price: 50, unit: 'tablet' as const }
      mockGet.mockResolvedValueOnce({
        data: { content: [summary], totalElements: 1, totalPages: 1, number: 0, size: 100, first: true, last: true, empty: false },
      }).mockResolvedValueOnce({ data: mockMedication })

      const result = await getMedications()
      expect(result.content).toHaveLength(1)
      expect(result.content[0].requiresPrescription).toBe(true)
    })
  })

  describe('getMedicationById', () => {
    it('fetches medication by id', async () => {
      mockGet.mockResolvedValue({ data: mockMedication })
      const result = await getMedicationById('med-1')
      expect(mockGet).toHaveBeenCalledWith('/catalog/medications/med-1')
    })
  })

  describe('createMedication', () => {
    it('posts medication data', async () => {
      mockPost.mockResolvedValue({ data: mockMedication })
      const result = await createMedication({ code: 'M-001', name: 'Ibuprofeno', price: 50, unit: 'tablet', requiresPrescription: true, isActive: true })
      expect(mockPost).toHaveBeenCalledWith('/catalog/medications', expect.objectContaining({ code: 'M-001' }))
    })
  })

  describe('toggleMedicationActive', () => {
    it('deletes then refetches', async () => {
      mockDelete.mockResolvedValue({ data: undefined })
      mockGet.mockResolvedValue({ data: mockMedication })
      await toggleMedicationActive('med-1')
      expect(mockDelete).toHaveBeenCalledWith('/catalog/medications/med-1')
    })
  })
})

describe('catalog API - search', () => {
  describe('searchServicesByName', () => {
    it('searches by query string', async () => {
      mockGet.mockResolvedValue({ data: [] })
      await searchServicesByName('consulta')
      expect(mockGet).toHaveBeenCalledWith('/catalog/services/search', { params: { q: 'consulta' } })
    })
  })
})
