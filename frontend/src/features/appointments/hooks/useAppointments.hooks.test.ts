import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createAllProviders } from '@/test/test-utils'
import { toast } from 'sonner'

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
  useStartAppointment,
  useCancelAppointment,
  useNoShowAppointment,
  useCompleteAppointment,
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
  it('calls createAppointment and shows success toast', async () => {
    vi.mocked(appointmentsApi.createAppointment).mockResolvedValue({ id: 'apt-1' } as never)
    const { result } = renderHook(() => useCreateAppointment(), { wrapper: createAllProviders() })
    result.current.mutate({ patientId: 'p-1', doctorId: 'doc-1', scheduledAt: '2025-06-20T10:00:00Z', durationMinutes: 30 })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(appointmentsApi.createAppointment).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Cita creada')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(appointmentsApi.createAppointment).mockRejectedValue(new Error('conflict'))
    const { result } = renderHook(() => useCreateAppointment(), { wrapper: createAllProviders() })
    result.current.mutate({ patientId: 'p-1', doctorId: 'doc-1', scheduledAt: '2025-06-20T10:00:00Z', durationMinutes: 30 })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error al crear la cita')
  })
})

describe('useConfirmAppointment', () => {
  it('calls confirmAppointment and shows success toast', async () => {
    vi.mocked(appointmentsApi.confirmAppointment).mockResolvedValue({ id: 'apt-1', status: 'confirmed' } as never)
    const { result } = renderHook(() => useConfirmAppointment(), { wrapper: createAllProviders() })
    result.current.mutate('apt-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(appointmentsApi.confirmAppointment).toHaveBeenCalledWith('apt-1', expect.anything())
    expect(toast.success).toHaveBeenCalledWith('Cita confirmada')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(appointmentsApi.confirmAppointment).mockRejectedValue(new Error('bad'))
    const { result } = renderHook(() => useConfirmAppointment(), { wrapper: createAllProviders() })
    result.current.mutate('apt-1')
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error al confirmar la cita')
  })
})

describe('useStartAppointment', () => {
  it('calls startAppointment and shows success toast', async () => {
    vi.mocked(appointmentsApi.startAppointment).mockResolvedValue({ id: 'apt-1', status: 'in_progress' } as never)
    const { result } = renderHook(() => useStartAppointment(), { wrapper: createAllProviders() })
    result.current.mutate('apt-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(appointmentsApi.startAppointment).toHaveBeenCalledWith('apt-1', expect.anything())
    expect(toast.success).toHaveBeenCalledWith('Cita iniciada')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(appointmentsApi.startAppointment).mockRejectedValue(new Error('bad'))
    const { result } = renderHook(() => useStartAppointment(), { wrapper: createAllProviders() })
    result.current.mutate('apt-1')
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error al iniciar la cita')
  })
})

describe('useCancelAppointment', () => {
  it('calls cancelAppointment and shows success toast', async () => {
    vi.mocked(appointmentsApi.cancelAppointment).mockResolvedValue({ id: 'apt-1', status: 'cancelled' } as never)
    const { result } = renderHook(() => useCancelAppointment(), { wrapper: createAllProviders() })
    result.current.mutate('apt-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(appointmentsApi.cancelAppointment).toHaveBeenCalledWith('apt-1', expect.anything())
    expect(toast.success).toHaveBeenCalledWith('Cita cancelada')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(appointmentsApi.cancelAppointment).mockRejectedValue(new Error('bad'))
    const { result } = renderHook(() => useCancelAppointment(), { wrapper: createAllProviders() })
    result.current.mutate('apt-1')
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error al cancelar la cita')
  })
})

describe('useNoShowAppointment', () => {
  it('calls noShowAppointment and shows success toast', async () => {
    vi.mocked(appointmentsApi.noShowAppointment).mockResolvedValue({ id: 'apt-1', status: 'no_show' } as never)
    const { result } = renderHook(() => useNoShowAppointment(), { wrapper: createAllProviders() })
    result.current.mutate('apt-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(appointmentsApi.noShowAppointment).toHaveBeenCalledWith('apt-1', expect.anything())
    expect(toast.success).toHaveBeenCalledWith('Cita marcada como no show')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(appointmentsApi.noShowAppointment).mockRejectedValue(new Error('bad'))
    const { result } = renderHook(() => useNoShowAppointment(), { wrapper: createAllProviders() })
    result.current.mutate('apt-1')
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error al actualizar la cita')
  })
})

describe('useCompleteAppointment', () => {
  it('calls completeAppointment with id and data and shows success toast', async () => {
    vi.mocked(appointmentsApi.completeAppointment).mockResolvedValue({ id: 'apt-1', medicalRecordId: 'mr-1' } as never)
    const data = { appointmentId: 'apt-1', clinicalNotes: 'Notes', physicalExam: null, vitalSigns: null }
    const { result } = renderHook(() => useCompleteAppointment(), { wrapper: createAllProviders() })
    result.current.mutate({ id: 'apt-1', data })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(appointmentsApi.completeAppointment).toHaveBeenCalledWith('apt-1', data)
    expect(toast.success).toHaveBeenCalledWith('Cita completada')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(appointmentsApi.completeAppointment).mockRejectedValue(new Error('bad'))
    const data = { appointmentId: 'apt-1', clinicalNotes: 'Notes', physicalExam: null, vitalSigns: null }
    const { result } = renderHook(() => useCompleteAppointment(), { wrapper: createAllProviders() })
    result.current.mutate({ id: 'apt-1', data })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error al completar la cita')
  })
})
