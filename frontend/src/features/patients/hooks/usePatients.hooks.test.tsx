import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createAllProviders } from '@/test/test-utils'
import { toast } from 'sonner'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/patients/api/patientsApi', () => ({
  getPatients: vi.fn(),
  getPatientById: vi.fn(),
  searchPatients: vi.fn(),
  createPatient: vi.fn(),
  updatePatient: vi.fn(),
}))

import * as patientsApi from '@/features/patients/api/patientsApi'
import { usePatients, usePatient, useSearchPatients, useCreatePatient, useUpdatePatient } from '@/features/patients/hooks/usePatients'
import { patientKeys } from '@/features/patients/hooks/usePatients'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('patientKeys', () => {
  it('creates correct list key', () => {
    expect(patientKeys.list({ lastName: 'Garcia' })).toEqual(['patients', 'list', { lastName: 'Garcia' }])
  })

  it('creates correct detail key', () => {
    expect(patientKeys.detail('p-1')).toEqual(['patients', 'detail', 'p-1'])
  })

  it('creates correct search key', () => {
    expect(patientKeys.search('Juan')).toEqual(['patients', 'search', 'Juan'])
  })
})

describe('usePatients', () => {
  it('fetches patients with select unwrapping content', async () => {
    const page = {
      content: [{ id: 'p-1', dni: '123', firstName: 'Juan', lastName: 'Perez', phone: '555' }],
      totalElements: 1, totalPages: 1, number: 0, size: 100, first: true, last: true, empty: false,
    }
    vi.mocked(patientsApi.getPatients).mockResolvedValue(page)

    const { result } = renderHook(() => usePatients({ lastName: 'Perez' }), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(patientsApi.getPatients).toHaveBeenCalledWith({ lastName: 'Perez', page: 0, size: 100 })
    expect(result.current.data).toEqual([{ id: 'p-1', dni: '123', firstName: 'Juan', lastName: 'Perez', phone: '555' }])
  })
})

describe('usePatient', () => {
  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => usePatient(''), { wrapper: createAllProviders() })
    expect(result.current.fetchStatus).toBe('idle')
    expect(patientsApi.getPatientById).not.toHaveBeenCalled()
  })

  it('fetches patient when id is provided', async () => {
    vi.mocked(patientsApi.getPatientById).mockResolvedValue({
      id: 'p-1', dni: '123', firstName: 'Juan', lastName: 'Perez',
      birthDate: '1990-01-01', gender: 'male', phone: '555', email: null, address: null, bloodType: null, allergies: null, active: true, createdAt: '2025-01-01T00:00:00Z',
    })

    const { result } = renderHook(() => usePatient('p-1'), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(patientsApi.getPatientById).toHaveBeenCalledWith('p-1')
  })
})

describe('useSearchPatients', () => {
  it('is disabled for single-char query', () => {
    const { result } = renderHook(() => useSearchPatients('a'), { wrapper: createAllProviders() })
    expect(result.current.fetchStatus).toBe('idle')
    expect(patientsApi.searchPatients).not.toHaveBeenCalled()
  })

  it('is disabled for empty query', () => {
    const { result } = renderHook(() => useSearchPatients(''), { wrapper: createAllProviders() })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('is enabled for queries > 1 char', async () => {
    vi.mocked(patientsApi.searchPatients).mockResolvedValue([
      { id: 'p-1', dni: '123', firstName: 'Juan', lastName: 'Perez', phone: '555' },
    ])

    const { result } = renderHook(() => useSearchPatients('Ju'), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(patientsApi.searchPatients).toHaveBeenCalledWith('Ju')
    expect(result.current.data).toHaveLength(1)
  })
})

describe('useCreatePatient', () => {
  it('calls createPatient and shows success toast', async () => {
    vi.mocked(patientsApi.createPatient).mockResolvedValue({ id: 'p-1' } as never)

    const { result } = renderHook(() => useCreatePatient(), { wrapper: createAllProviders() })
    result.current.mutate({ dni: '123', firstName: 'Juan', lastName: 'Perez', birthDate: '1990-01-01', gender: 'male', phone: '555' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(patientsApi.createPatient).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Paciente creado')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(patientsApi.createPatient).mockRejectedValue(new Error('conflict'))

    const { result } = renderHook(() => useCreatePatient(), { wrapper: createAllProviders() })
    result.current.mutate({ dni: '123', firstName: 'Juan', lastName: 'Perez', birthDate: '1990-01-01', gender: 'male', phone: '555' })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(toast.error).toHaveBeenCalledWith('Error al crear el paciente')
  })
})

describe('useUpdatePatient', () => {
  it('calls updatePatient with id and data and shows success toast', async () => {
    vi.mocked(patientsApi.updatePatient).mockResolvedValue({ id: 'p-1' } as never)

    const { result } = renderHook(() => useUpdatePatient(), { wrapper: createAllProviders() })
    result.current.mutate({ id: 'p-1', data: { firstName: 'New', lastName: 'Name', birthDate: '1990-01-01', gender: 'male', phone: '555' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(patientsApi.updatePatient).toHaveBeenCalledWith('p-1', expect.objectContaining({ firstName: 'New' }))
    expect(toast.success).toHaveBeenCalledWith('Paciente actualizado')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(patientsApi.updatePatient).mockRejectedValue(new Error('not found'))

    const { result } = renderHook(() => useUpdatePatient(), { wrapper: createAllProviders() })
    result.current.mutate({ id: 'p-1', data: { firstName: 'New', lastName: 'Name', birthDate: '1990-01-01', gender: 'male', phone: '555' } })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(toast.error).toHaveBeenCalledWith('Error al actualizar el paciente')
  })
})
