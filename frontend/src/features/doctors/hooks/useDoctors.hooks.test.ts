import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createAllProviders } from '@/test/test-utils'
import { toast } from 'sonner'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/doctors/api/doctorsApi', () => ({
  getDoctors: vi.fn(),
  getDoctorById: vi.fn(),
  getSystemUsers: vi.fn(),
  createDoctor: vi.fn(),
  updateDoctor: vi.fn(),
  deactivateDoctor: vi.fn(),
}))

import * as doctorsApi from '@/features/doctors/api/doctorsApi'
import { useDoctors, useDoctorById, useSystemUsers, useCreateDoctor, useUpdateDoctor, useDeactivateDoctor } from '@/features/doctors/hooks/useDoctors'
import { doctorKeys } from '@/features/doctors/hooks/useDoctors'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('doctorKeys', () => {
  it('creates correct list key', () => {
    expect(doctorKeys.list({ specialty: 'Cardio' })).toEqual(['doctors', 'list', { specialty: 'Cardio' }])
  })

  it('creates correct detail key', () => {
    expect(doctorKeys.detail('doc-1')).toEqual(['doctors', 'detail', 'doc-1'])
  })

  it('creates correct systemUsers key', () => {
    expect(doctorKeys.systemUsers({ role: 'DOCTOR' })).toEqual(['doctors', 'system-users', { role: 'DOCTOR' }])
  })
})

describe('useDoctors', () => {
  it('fetches doctors with select unwrapping content', async () => {
    const page = {
      content: [{ id: 'doc-1', licenseNumber: 'MED-1', firstName: 'Maria', lastName: 'Garcia', specialty: 'Cardio', phone: '555', email: 'm@t.com', isActive: true, createdAt: '2025-01-01T00:00:00Z' }],
      totalElements: 1, totalPages: 1, number: 0, size: 100, first: true, last: true, empty: false,
    }
    vi.mocked(doctorsApi.getDoctors).mockResolvedValue(page)

    const { result } = renderHook(() => useDoctors(), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(doctorsApi.getDoctors).toHaveBeenCalledWith({ page: 0, size: 100, specialty: undefined, active: true })
    expect(result.current.data).toHaveLength(1)
  })

  it('passes specialty filter', async () => {
    vi.mocked(doctorsApi.getDoctors).mockResolvedValue({
      content: [], totalElements: 0, totalPages: 0, number: 0, size: 100, first: true, last: true, empty: true,
    })

    const { result } = renderHook(() => useDoctors({ specialty: 'Cardio' }), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(doctorsApi.getDoctors).toHaveBeenCalledWith(expect.objectContaining({ specialty: 'Cardio' }))
  })
})

describe('useDoctorById', () => {
  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useDoctorById(''), { wrapper: createAllProviders() })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fetches doctor by id', async () => {
    vi.mocked(doctorsApi.getDoctorById).mockResolvedValue({
      id: 'doc-1', licenseNumber: 'MED-1', firstName: 'Maria', lastName: 'Garcia', specialty: 'Cardio', phone: '555', email: 'm@t.com', isActive: true, userId: 'u-1', username: 'mgarcia', createdAt: '2025-01-01T00:00:00Z',
    })

    const { result } = renderHook(() => useDoctorById('doc-1'), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(doctorsApi.getDoctorById).toHaveBeenCalledWith('doc-1')
  })
})

describe('useSystemUsers', () => {
  it('is disabled when role is not DOCTOR', () => {
    const { result } = renderHook(() => useSystemUsers({ role: 'ADMIN' }), { wrapper: createAllProviders() })
    expect(result.current.fetchStatus).toBe('idle')
    expect(doctorsApi.getSystemUsers).not.toHaveBeenCalled()
  })

  it('is enabled when role is DOCTOR', async () => {
    vi.mocked(doctorsApi.getSystemUsers).mockResolvedValue({
      content: [{ id: 'u-1', username: 'dr.smith', email: 'dr@clinic.com', role: 'DOCTOR', active: true }],
      totalElements: 1, totalPages: 1, number: 0, size: 100, first: true, last: true, empty: false,
    })

    const { result } = renderHook(() => useSystemUsers({ role: 'DOCTOR' }), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(doctorsApi.getSystemUsers).toHaveBeenCalledWith({ role: 'DOCTOR', active: undefined })
    expect(result.current.data).toHaveLength(1)
  })
})

describe('useCreateDoctor', () => {
  it('calls createDoctor and shows success toast', async () => {
    vi.mocked(doctorsApi.createDoctor).mockResolvedValue({ id: 'doc-1' } as never)
    const { result } = renderHook(() => useCreateDoctor(), { wrapper: createAllProviders() })
    result.current.mutate({ licenseNumber: 'MED-1', firstName: 'Maria', lastName: 'Garcia', specialty: 'Cardio', phone: '555', email: 'm@t.com' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(doctorsApi.createDoctor).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Médico creado')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(doctorsApi.createDoctor).mockRejectedValue(new Error('conflict'))
    const { result } = renderHook(() => useCreateDoctor(), { wrapper: createAllProviders() })
    result.current.mutate({ licenseNumber: 'MED-1', firstName: 'Maria', lastName: 'Garcia', specialty: 'Cardio', phone: '555', email: 'm@t.com' })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error al crear el médico')
  })
})

describe('useUpdateDoctor', () => {
  it('calls updateDoctor with id and data and shows success toast', async () => {
    vi.mocked(doctorsApi.updateDoctor).mockResolvedValue({ id: 'doc-1' } as never)
    const { result } = renderHook(() => useUpdateDoctor(), { wrapper: createAllProviders() })
    result.current.mutate({ id: 'doc-1', data: { firstName: 'New', lastName: 'Name', specialty: 'Cardio', phone: '555', email: 'm@t.com', isActive: true } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(doctorsApi.updateDoctor).toHaveBeenCalledWith('doc-1', expect.objectContaining({ firstName: 'New' }))
    expect(toast.success).toHaveBeenCalledWith('Médico actualizado')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(doctorsApi.updateDoctor).mockRejectedValue(new Error('not found'))
    const { result } = renderHook(() => useUpdateDoctor(), { wrapper: createAllProviders() })
    result.current.mutate({ id: 'doc-1', data: { firstName: 'New', lastName: 'Name', specialty: 'Cardio', phone: '555', email: 'm@t.com', isActive: true } })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error al actualizar el médico')
  })
})

describe('useDeactivateDoctor', () => {
  it('calls deactivateDoctor and shows success toast', async () => {
    vi.mocked(doctorsApi.deactivateDoctor).mockResolvedValue(undefined)
    const { result } = renderHook(() => useDeactivateDoctor(), { wrapper: createAllProviders() })
    result.current.mutate('doc-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(doctorsApi.deactivateDoctor).toHaveBeenCalledWith('doc-1', expect.anything())
    expect(toast.success).toHaveBeenCalledWith('Médico desactivado')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(doctorsApi.deactivateDoctor).mockRejectedValue(new Error('forbidden'))
    const { result } = renderHook(() => useDeactivateDoctor(), { wrapper: createAllProviders() })
    result.current.mutate('doc-1')
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error al desactivar el médico')
  })
})
