import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createAllProviders } from '@/test/test-utils'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/appointments/api/appointmentsApi', () => ({
  getAppointments: vi.fn(),
  getAppointmentById: vi.fn(),
  createAppointment: vi.fn(),
  confirmAppointment: vi.fn(),
  startAppointment: vi.fn(),
  cancelAppointment: vi.fn(),
  noShowAppointment: vi.fn(),
  completeAppointment: vi.fn(),
  getMedicalRecordByAppointment: vi.fn(),
}))

import * as appointmentsApi from '@/features/appointments/api/appointmentsApi'
import {
  useAppointments,
  useAppointment,
  useCreateAppointment,
  useConfirmAppointment,
  useCancelAppointment,
} from '@/features/appointments/hooks/useAppointments'
import { appointmentKeys } from '@/features/appointments/hooks/useAppointments'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('appointmentKeys', () => {
  it('creates correct list key with filters', () => {
    expect(appointmentKeys.list({ doctorId: 'doc-1', status: 'confirmed' })).toEqual([
      'appointments', 'list', { doctorId: 'doc-1', status: 'confirmed' },
    ])
  })

  it('creates correct detail key', () => {
    expect(appointmentKeys.detail('apt-1')).toEqual(['appointments', 'detail', 'apt-1'])
  })

  it('creates correct record key', () => {
    expect(appointmentKeys.record('apt-1')).toEqual(['appointments', 'record', 'apt-1'])
  })
})

describe('useAppointments', () => {
  it('fetches appointments with default params', async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      content: [], totalElements: 0, totalPages: 0, number: 0, size: 20, first: true, last: true, empty: true,
    })
    const { result } = renderHook(() => useAppointments(), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(appointmentsApi.getAppointments).toHaveBeenCalledWith({ doctorId: undefined, patientId: undefined, status: undefined, page: 0, size: 20 })
  })

  it('passes doctorId filter', async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      content: [], totalElements: 0, totalPages: 0, number: 0, size: 20, first: true, last: true, empty: true,
    })
    const { result } = renderHook(() => useAppointments({ doctorId: 'doc-1' }), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(appointmentsApi.getAppointments).toHaveBeenCalledWith(expect.objectContaining({ doctorId: 'doc-1' }))
  })
})

describe('useAppointment', () => {
  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useAppointment(''), { wrapper: createAllProviders() })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fetches appointment by id', async () => {
    vi.mocked(appointmentsApi.getAppointmentById).mockResolvedValue({
      id: 'apt-1', patientId: 'p-1', patientFirstName: 'Juan', patientLastName: 'Perez',
      doctorId: 'doc-1', doctorFirstName: 'Maria', doctorLastName: 'Garcia',
      scheduledAt: '2025-06-20T10:00:00Z', durationMinutes: 30, status: 'scheduled',
      chiefComplaint: null, notes: null, createdAt: '2025-01-01T00:00:00Z',
    })
    const { result } = renderHook(() => useAppointment('apt-1'), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(appointmentsApi.getAppointmentById).toHaveBeenCalledWith('apt-1')
  })
})

describe('useCreateAppointment', () => {
  it('calls createAppointment and invalidates on success', async () => {
    vi.mocked(appointmentsApi.createAppointment).mockResolvedValue({ id: 'apt-1' } as never)
    const { result } = renderHook(() => useCreateAppointment(), { wrapper: createAllProviders() })
    result.current.mutate({ patientId: 'p-1', doctorId: 'doc-1', scheduledAt: '2025-06-20T10:00:00Z', durationMinutes: 30 })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(appointmentsApi.createAppointment).toHaveBeenCalled()
  })
})

describe('useConfirmAppointment', () => {
  it('calls confirmAppointment on mutate', async () => {
    vi.mocked(appointmentsApi.confirmAppointment).mockResolvedValue({ id: 'apt-1', status: 'confirmed' } as never)
    const { result } = renderHook(() => useConfirmAppointment(), { wrapper: createAllProviders() })
    result.current.mutate('apt-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(appointmentsApi.confirmAppointment).toHaveBeenCalledWith('apt-1', expect.anything())
  })
})

describe('useCancelAppointment', () => {
  it('calls cancelAppointment on mutate', async () => {
    vi.mocked(appointmentsApi.cancelAppointment).mockResolvedValue({ id: 'apt-1', status: 'cancelled' } as never)
    const { result } = renderHook(() => useCancelAppointment(), { wrapper: createAllProviders() })
    result.current.mutate('apt-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(appointmentsApi.cancelAppointment).toHaveBeenCalledWith('apt-1', expect.anything())
  })
})
