import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getProviders,
  createProvider,
  updateProvider,
  deactivateProvider,
  getPolicies,
  createPolicy,
  updatePolicy,
  toProviderCreateRequest,
  toProviderUpdateRequest,
  toPolicyRequest,
  toPolicyUpdateRequest,
} from '@/features/insurance/api/insuranceApi'
import type { ProviderFormValues, PolicyFormValues } from '@/features/insurance/api/insuranceApi'

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

const mockProvider = {
  id: 'prov-1', name: 'Seguros ABC', code: 'ABC-001', phone: '555-1111',
  email: 'info@abc.com', address: 'Av. Principal', isActive: true, createdAt: '2025-01-01T00:00:00Z',
}

const apiPolicy = {
  id: 'pol-1', patientId: 'p-1', patientFirstName: 'Juan', patientLastName: 'Perez',
  providerId: 'prov-1', providerName: 'Seguros ABC', policyNumber: 'POL-001',
  coveragePercentage: 80, deductible: 500, startDate: '2025-01-01', endDate: '2025-12-31', isActive: true,
}

describe('insurance API', () => {
  describe('getProviders', () => {
    it('fetches paginated providers', async () => {
      mockGet.mockResolvedValue({
        data: { content: [mockProvider], totalElements: 1, totalPages: 1, number: 0, size: 20, first: true, last: true, empty: false },
      })
      const result = await getProviders()
      expect(mockGet).toHaveBeenCalledWith('/insurance/providers', {
        params: { active: undefined, page: 0, size: 20, sort: undefined },
      })
      expect(result.content).toHaveLength(1)
    })
  })

  describe('createProvider', () => {
    it('posts provider data', async () => {
      mockPost.mockResolvedValue({ data: mockProvider })
      const result = await createProvider({ name: 'Seguros ABC', code: 'ABC-001', phone: '555-1111' })
      expect(mockPost).toHaveBeenCalledWith('/insurance/providers', expect.objectContaining({ code: 'ABC-001' }))
      expect(result.id).toBe('prov-1')
    })
  })

  describe('updateProvider', () => {
    it('puts provider data', async () => {
      mockPut.mockResolvedValue({ data: mockProvider })
      const result = await updateProvider('prov-1', { name: 'Seguros ABC', phone: '555-1111', isActive: true })
      expect(mockPut).toHaveBeenCalledWith('/insurance/providers/prov-1', expect.objectContaining({ name: 'Seguros ABC' }))
    })
  })

  describe('deactivateProvider', () => {
    it('deletes then refetches', async () => {
      mockDelete.mockResolvedValue({ data: undefined })
      mockGet.mockResolvedValue({ data: mockProvider })
      const result = await deactivateProvider('prov-1')
      expect(mockDelete).toHaveBeenCalledWith('/insurance/providers/prov-1')
      expect(mockGet).toHaveBeenCalledWith('/insurance/providers/prov-1')
    })
  })

  describe('getPolicies', () => {
    it('fetches policies and enriches each with patient+provider data', async () => {
      mockGet.mockResolvedValueOnce({
        data: { content: [apiPolicy], totalElements: 1, totalPages: 1, number: 0, size: 20, first: true, last: true, empty: false },
      }).mockResolvedValueOnce({ data: { id: 'p-1', dni: '123', firstName: 'Juan', lastName: 'Perez', allergies: null } })
      .mockResolvedValueOnce({ data: { id: 'prov-1', name: 'Seguros ABC', code: 'ABC-001' } })

      const result = await getPolicies()
      expect(result.content).toHaveLength(1)
      expect(result.content[0].patient.firstName).toBe('Juan')
      expect(result.content[0].provider.name).toBe('Seguros ABC')
    })
  })

  describe('createPolicy', () => {
    it('posts and enriches policy', async () => {
      mockPost.mockResolvedValueOnce({ data: apiPolicy })
      mockGet.mockResolvedValueOnce({ data: { id: 'p-1', dni: '123', firstName: 'Juan', lastName: 'Perez', allergies: null } })
      .mockResolvedValueOnce({ data: { id: 'prov-1', name: 'Seguros ABC', code: 'ABC-001' } })

      const result = await createPolicy({
        patientId: 'p-1', providerId: 'prov-1', policyNumber: 'POL-001',
        coveragePercentage: 80, deductible: 500, startDate: '2025-01-01', endDate: '2025-12-31',
      })
      expect(mockPost).toHaveBeenCalledWith('/insurance/policies', expect.objectContaining({ policyNumber: 'POL-001' }))
      expect(result.patient.firstName).toBe('Juan')
    })
  })

  describe('updatePolicy', () => {
    it('puts and enriches policy', async () => {
      mockPut.mockResolvedValueOnce({ data: apiPolicy })
      mockGet.mockResolvedValueOnce({ data: { id: 'p-1', dni: '123', firstName: 'Juan', lastName: 'Perez', allergies: null } })
      .mockResolvedValueOnce({ data: { id: 'prov-1', name: 'Seguros ABC', code: 'ABC-001' } })

      const result = await updatePolicy('pol-1', {
        coveragePercentage: 90, deductible: 300, startDate: '2025-01-01', endDate: '2025-12-31', isActive: true,
      })
      expect(result.provider.name).toBe('Seguros ABC')
    })
  })
})

describe('insurance adapters', () => {
  describe('toProviderCreateRequest', () => {
    it('trims strings and converts empty optionals to null', () => {
      const values: ProviderFormValues = {
        name: ' ABC ', code: ' 001 ', phone: ' 555 ', email: ' info@abc.com ',
        address: ' Address ', isActive: true,
      }
      const result = toProviderCreateRequest(values)
      expect(result.name).toBe('ABC')
      expect(result.code).toBe('001')
      expect(result.email).toBe('info@abc.com')
    })

    it('nullifies empty email and address', () => {
      const values: ProviderFormValues = {
        name: 'ABC', code: '001', phone: '555', isActive: true,
      }
      const result = toProviderCreateRequest(values)
      expect(result.email).toBeNull()
      expect(result.address).toBeNull()
    })
  })

  describe('toProviderUpdateRequest', () => {
    it('excludes code, includes isActive', () => {
      const values: ProviderFormValues = {
        name: 'ABC', code: '001', phone: '555', isActive: true,
      }
      const result = toProviderUpdateRequest(values, false)
      expect(result.code).toBeUndefined()
      expect(result.isActive).toBe(false)
    })
  })

  describe('toPolicyRequest', () => {
    it('trims policyNumber and passes other fields', () => {
      const values: PolicyFormValues = {
        patientId: 'p-1', providerId: 'prov-1', policyNumber: ' POL-001 ',
        coveragePercentage: 80, deductible: 500, startDate: '2025-01-01', endDate: '2025-12-31', isActive: true,
      }
      const result = toPolicyRequest(values)
      expect(result.policyNumber).toBe('POL-001')
      expect(result.coveragePercentage).toBe(80)
    })
  })

  describe('toPolicyUpdateRequest', () => {
    it('excludes patient/provider/policyNumber', () => {
      const values: PolicyFormValues = {
        patientId: 'p-1', providerId: 'prov-1', policyNumber: 'POL-001',
        coveragePercentage: 80, deductible: 500, startDate: '2025-01-01', endDate: '2025-12-31', isActive: true,
      }
      const result = toPolicyUpdateRequest(values, true)
      expect(result.patientId).toBeUndefined()
      expect(result.providerId).toBeUndefined()
      expect(result.policyNumber).toBeUndefined()
      expect(result.isActive).toBe(true)
    })
  })
})
