import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createAllProviders } from '@/test/test-utils'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/catalog/api/catalogApi', () => ({
  getServices: vi.fn(),
  getServiceById: vi.fn(),
  createService: vi.fn(),
  updateService: vi.fn(),
  toggleServiceActive: vi.fn(),
  getMedications: vi.fn(),
  getMedicationById: vi.fn(),
  createMedication: vi.fn(),
  updateMedication: vi.fn(),
  toggleMedicationActive: vi.fn(),
  searchServicesByName: vi.fn(),
  listFilteredServices: vi.fn(),
  listFilteredMedications: vi.fn(),
}))

import * as catalogApi from '@/features/catalog/api/catalogApi'
import { useServices, useMedications, useToggleServiceActive, useCreateService } from '@/features/catalog/hooks/useCatalog'
import { serviceKeys, medicationKeys } from '@/features/catalog/hooks/useCatalog'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('serviceKeys and medicationKeys', () => {
  it('serviceKeys.all is base key', () => {
    expect(serviceKeys.all).toEqual(['catalog', 'services'])
  })

  it('medicationKeys.all is base key', () => {
    expect(medicationKeys.all).toEqual(['catalog', 'medications'])
  })
})

describe('useServices', () => {
  it('fetches services and unwraps content via select', async () => {
    vi.mocked(catalogApi.getServices).mockResolvedValue({
      content: [{ id: 'svc-1', code: 'C-001', name: 'Consulta', description: null, price: 500, category: 'consultation', isActive: true, createdAt: '2025-01-01T00:00:00Z' }],
      totalElements: 1, totalPages: 1, number: 0, size: 100, first: true, last: true, empty: false,
    })
    const { result } = renderHook(() => useServices(), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(catalogApi.getServices).toHaveBeenCalledWith({ includeInactive: undefined, size: 100 })
  })
})

describe('useMedications', () => {
  it('fetches medications and unwraps content via select', async () => {
    vi.mocked(catalogApi.getMedications).mockResolvedValue({
      content: [{ id: 'med-1', code: 'M-001', name: 'Ibuprofeno', description: null, price: 50, unit: 'tablet', requiresPrescription: true, isActive: true, createdAt: '2025-01-01T00:00:00Z' }],
      totalElements: 1, totalPages: 1, number: 0, size: 100, first: true, last: true, empty: false,
    })
    const { result } = renderHook(() => useMedications(), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(catalogApi.getMedications).toHaveBeenCalledWith({ includeInactive: undefined, size: 100 })
  })
})

describe('useToggleServiceActive', () => {
  it('calls toggleServiceActive with id', async () => {
    vi.mocked(catalogApi.toggleServiceActive).mockResolvedValue({
      id: 'svc-1', code: 'C-001', name: 'Consulta', description: null, price: 500, category: 'consultation', isActive: false, createdAt: '2025-01-01T00:00:00Z',
    })
    const { result } = renderHook(() => useToggleServiceActive(), { wrapper: createAllProviders() })
    result.current.mutate('svc-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(catalogApi.toggleServiceActive).toHaveBeenCalledWith('svc-1', expect.anything())
  })
})

describe('useCreateService', () => {
  it('calls createService', async () => {
    vi.mocked(catalogApi.createService).mockResolvedValue({ id: 'svc-1' } as never)
    const { result } = renderHook(() => useCreateService(), { wrapper: createAllProviders() })
    result.current.mutate({ code: 'C-001', name: 'Consulta', price: 500, category: 'consultation', isActive: true })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(catalogApi.createService).toHaveBeenCalled()
  })
})
