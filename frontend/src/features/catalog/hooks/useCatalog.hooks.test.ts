import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createAllProviders } from '@/test/test-utils'
import { toast } from 'sonner'

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
import {
  useServices,
  useMedications,
  useCreateService,
  useUpdateService,
  useToggleServiceActive,
  useCreateMedication,
  useUpdateMedication,
  useToggleMedicationActive,
} from '@/features/catalog/hooks/useCatalog'
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

describe('useCreateService', () => {
  it('calls createService and shows success toast', async () => {
    vi.mocked(catalogApi.createService).mockResolvedValue({ id: 'svc-1' } as never)
    const { result } = renderHook(() => useCreateService(), { wrapper: createAllProviders() })
    result.current.mutate({ code: 'C-001', name: 'Consulta', price: 500, category: 'consultation', isActive: true })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(catalogApi.createService).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Servicio creado')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(catalogApi.createService).mockRejectedValue(new Error('conflict'))
    const { result } = renderHook(() => useCreateService(), { wrapper: createAllProviders() })
    result.current.mutate({ code: 'C-001', name: 'Consulta', price: 500, category: 'consultation', isActive: true })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error al crear el servicio')
  })
})

describe('useUpdateService', () => {
  it('calls updateService with id and data and shows success toast', async () => {
    vi.mocked(catalogApi.updateService).mockResolvedValue({ id: 'svc-1' } as never)
    const { result } = renderHook(() => useUpdateService(), { wrapper: createAllProviders() })
    result.current.mutate({ id: 'svc-1', data: { name: 'Consulta General', price: 600, category: 'consultation' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(catalogApi.updateService).toHaveBeenCalledWith('svc-1', expect.objectContaining({ name: 'Consulta General' }))
    expect(toast.success).toHaveBeenCalledWith('Servicio actualizado')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(catalogApi.updateService).mockRejectedValue(new Error('not found'))
    const { result } = renderHook(() => useUpdateService(), { wrapper: createAllProviders() })
    result.current.mutate({ id: 'svc-1', data: { name: 'Consulta General', price: 600, category: 'consultation' } })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error al actualizar el servicio')
  })
})

describe('useToggleServiceActive', () => {
  it('shows "activado" toast when activating service', async () => {
    vi.mocked(catalogApi.toggleServiceActive).mockResolvedValue({
      id: 'svc-1', code: 'C-001', name: 'Consulta', description: null, price: 500, category: 'consultation', isActive: true, createdAt: '2025-01-01T00:00:00Z',
    })
    const { result } = renderHook(() => useToggleServiceActive(), { wrapper: createAllProviders() })
    result.current.mutate('svc-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(catalogApi.toggleServiceActive).toHaveBeenCalledWith('svc-1', expect.anything())
    expect(toast.success).toHaveBeenCalledWith('Servicio activado')
  })

  it('shows "desactivado" toast when deactivating service', async () => {
    vi.mocked(catalogApi.toggleServiceActive).mockResolvedValue({
      id: 'svc-1', code: 'C-001', name: 'Consulta', description: null, price: 500, category: 'consultation', isActive: false, createdAt: '2025-01-01T00:00:00Z',
    })
    const { result } = renderHook(() => useToggleServiceActive(), { wrapper: createAllProviders() })
    result.current.mutate('svc-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith('Servicio desactivado')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(catalogApi.toggleServiceActive).mockRejectedValue(new Error('bad'))
    const { result } = renderHook(() => useToggleServiceActive(), { wrapper: createAllProviders() })
    result.current.mutate('svc-1')
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error al cambiar el estado')
  })
})

describe('useCreateMedication', () => {
  it('calls createMedication and shows success toast', async () => {
    vi.mocked(catalogApi.createMedication).mockResolvedValue({ id: 'med-1' } as never)
    const { result } = renderHook(() => useCreateMedication(), { wrapper: createAllProviders() })
    result.current.mutate({ code: 'M-001', name: 'Ibuprofeno', price: 50, unit: 'tablet', requiresPrescription: true, isActive: true })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(catalogApi.createMedication).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Medicamento creado')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(catalogApi.createMedication).mockRejectedValue(new Error('conflict'))
    const { result } = renderHook(() => useCreateMedication(), { wrapper: createAllProviders() })
    result.current.mutate({ code: 'M-001', name: 'Ibuprofeno', price: 50, unit: 'tablet', requiresPrescription: true, isActive: true })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error al crear el medicamento')
  })
})

describe('useUpdateMedication', () => {
  it('calls updateMedication with id and data and shows success toast', async () => {
    vi.mocked(catalogApi.updateMedication).mockResolvedValue({ id: 'med-1' } as never)
    const { result } = renderHook(() => useUpdateMedication(), { wrapper: createAllProviders() })
    result.current.mutate({ id: 'med-1', data: { name: 'Ibuprofeno 600', price: 80, unit: 'tablet' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(catalogApi.updateMedication).toHaveBeenCalledWith('med-1', expect.objectContaining({ name: 'Ibuprofeno 600' }))
    expect(toast.success).toHaveBeenCalledWith('Medicamento actualizado')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(catalogApi.updateMedication).mockRejectedValue(new Error('not found'))
    const { result } = renderHook(() => useUpdateMedication(), { wrapper: createAllProviders() })
    result.current.mutate({ id: 'med-1', data: { name: 'Ibuprofeno 600', price: 80, unit: 'tablet' } })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error al actualizar el medicamento')
  })
})

describe('useToggleMedicationActive', () => {
  it('shows "activado" toast when activating medication', async () => {
    vi.mocked(catalogApi.toggleMedicationActive).mockResolvedValue({
      id: 'med-1', code: 'M-001', name: 'Ibuprofeno', description: null, price: 50, unit: 'tablet', requiresPrescription: true, isActive: true, createdAt: '2025-01-01T00:00:00Z',
    })
    const { result } = renderHook(() => useToggleMedicationActive(), { wrapper: createAllProviders() })
    result.current.mutate('med-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(catalogApi.toggleMedicationActive).toHaveBeenCalledWith('med-1', expect.anything())
    expect(toast.success).toHaveBeenCalledWith('Medicamento activado')
  })

  it('shows "desactivado" toast when deactivating medication', async () => {
    vi.mocked(catalogApi.toggleMedicationActive).mockResolvedValue({
      id: 'med-1', code: 'M-001', name: 'Ibuprofeno', description: null, price: 50, unit: 'tablet', requiresPrescription: true, isActive: false, createdAt: '2025-01-01T00:00:00Z',
    })
    const { result } = renderHook(() => useToggleMedicationActive(), { wrapper: createAllProviders() })
    result.current.mutate('med-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith('Medicamento desactivado')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(catalogApi.toggleMedicationActive).mockRejectedValue(new Error('bad'))
    const { result } = renderHook(() => useToggleMedicationActive(), { wrapper: createAllProviders() })
    result.current.mutate('med-1')
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error al cambiar el estado')
  })
})
