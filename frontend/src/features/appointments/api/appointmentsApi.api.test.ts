import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  confirmAppointment,
  startAppointment,
  completeAppointment,
  cancelAppointment,
  noShowAppointment,
  getAvailability,
  getMedicalRecordByAppointment,
  toAppointmentCreateRequest,
} from '@/features/appointments/api/appointmentsApi'
import type { AppointmentFormValues } from '@/features/appointments/api/appointmentsApi'

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
const mockPatch = vi.mocked(mockedClient.patch)

beforeEach(() => {
  vi.clearAllMocks()
})

const mockAppointment = {
  id: 'apt-1',
  patientId: 'p-1',
  patientFirstName: 'Juan',
  patientLastName: 'Perez',
  doctorId: 'doc-1',
  doctorFirstName: 'Maria',
  doctorLastName: 'Garcia',
  scheduledAt: '2025-06-20T10:00:00Z',
  durationMinutes: 30,
  status: 'scheduled' as const,
  chiefComplaint: null,
  notes: null,
  createdAt: '2025-06-01T00:00:00Z',
}

describe('appointments API', () => {
  describe('getAppointments', () => {
    it('fetches paginated appointments with default params', async () => {
      mockGet.mockResolvedValue({
        data: { content: [mockAppointment], totalElements: 1, totalPages: 1, number: 0, size: 20, first: true, last: true, empty: false },
      })
      const result = await getAppointments()
      expect(mockGet).toHaveBeenCalledWith('/appointments', {
        params: { doctorId: undefined, patientId: undefined, status: undefined, from: undefined, to: undefined, page: 0, size: 20, sort: undefined },
      })
      expect(result.content).toHaveLength(1)
    })

    it('uppercases status filter', async () => {
      mockGet.mockResolvedValue({ data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20, first: true, last: true, empty: true } })
      await getAppointments({ status: 'confirmed' })
      expect(mockGet).toHaveBeenCalledWith('/appointments', {
        params: expect.objectContaining({ status: 'CONFIRMED' }),
      })
    })

    it('passes all filter params', async () => {
      mockGet.mockResolvedValue({ data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20, first: true, last: true, empty: true } })
      await getAppointments({ doctorId: 'doc-1', patientId: 'p-1', status: 'scheduled', from: '2025-01-01', to: '2025-12-31' })
      expect(mockGet).toHaveBeenCalledWith('/appointments', {
        params: expect.objectContaining({ doctorId: 'doc-1', patientId: 'p-1', status: 'SCHEDULED', from: '2025-01-01', to: '2025-12-31' }),
      })
    })
  })

  describe('getAppointmentById', () => {
    it('fetches single appointment', async () => {
      mockGet.mockResolvedValue({ data: mockAppointment })
      const result = await getAppointmentById('apt-1')
      expect(mockGet).toHaveBeenCalledWith('/appointments/apt-1')
      expect(result.id).toBe('apt-1')
    })
  })

  describe('createAppointment', () => {
    it('posts appointment data', async () => {
      mockPost.mockResolvedValue({ data: mockAppointment })
      const result = await createAppointment({
        patientId: 'p-1',
        doctorId: 'doc-1',
        scheduledAt: '2025-06-20T10:00:00Z',
        durationMinutes: 30,
      })
      expect(mockPost).toHaveBeenCalledWith('/appointments', expect.objectContaining({ patientId: 'p-1' }))
      expect(result.id).toBe('apt-1')
    })
  })

  describe('status transitions', () => {
    it('confirmAppointment patches to /confirm', async () => {
      mockPatch.mockResolvedValue({ data: { ...mockAppointment, status: 'confirmed' } })
      const result = await confirmAppointment('apt-1')
      expect(mockPatch).toHaveBeenCalledWith('/appointments/apt-1/confirm')
      expect(result.status).toBe('confirmed')
    })

    it('startAppointment patches to /start', async () => {
      mockPatch.mockResolvedValue({ data: { ...mockAppointment, status: 'in_progress' } })
      const result = await startAppointment('apt-1')
      expect(mockPatch).toHaveBeenCalledWith('/appointments/apt-1/start')
      expect(result.status).toBe('in_progress')
    })

    it('completeAppointment patches to /complete with body', async () => {
      const body = { appointmentId: 'apt-1', patientId: 'p-1', clinicalNotes: 'Notes' }
      mockPatch.mockResolvedValue({ data: { ...mockAppointment, status: 'completed' } })
      const result = await completeAppointment('apt-1', body)
      expect(mockPatch).toHaveBeenCalledWith('/appointments/apt-1/complete', body)
      expect(result.status).toBe('completed')
    })

    it('cancelAppointment patches to /cancel', async () => {
      mockPatch.mockResolvedValue({ data: { ...mockAppointment, status: 'cancelled' } })
      const result = await cancelAppointment('apt-1')
      expect(mockPatch).toHaveBeenCalledWith('/appointments/apt-1/cancel')
      expect(result.status).toBe('cancelled')
    })

    it('noShowAppointment patches to /no-show', async () => {
      mockPatch.mockResolvedValue({ data: { ...mockAppointment, status: 'no_show' } })
      const result = await noShowAppointment('apt-1')
      expect(mockPatch).toHaveBeenCalledWith('/appointments/apt-1/no-show')
      expect(result.status).toBe('no_show')
    })
  })

  describe('getAvailability', () => {
    it('fetches availability with query params', async () => {
      mockGet.mockResolvedValue({ data: [mockAppointment] })
      const result = await getAvailability('doc-1', '2025-06-01', '2025-06-30')
      expect(mockGet).toHaveBeenCalledWith('/appointments/availability', {
        params: { doctorId: 'doc-1', from: '2025-06-01', to: '2025-06-30' },
      })
      expect(result).toHaveLength(1)
    })
  })

  describe('getMedicalRecordByAppointment', () => {
    it('returns record when found', async () => {
      const record = { id: 'mr-1', appointmentId: 'apt-1', patientId: 'p-1', clinicalNotes: 'Notes', vitalSigns: null, physicalExam: null, recordDate: '2025-06-20T10:00:00Z', diagnoses: [], prescriptions: [], procedures: [] }
      mockGet.mockResolvedValue({ data: record })
      const result = await getMedicalRecordByAppointment('apt-1')
      expect(mockGet).toHaveBeenCalledWith('/medical-records/appointment/apt-1')
      expect(result?.id).toBe('mr-1')
    })

    it('returns null on error', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))
      const result = await getMedicalRecordByAppointment('apt-999')
      expect(result).toBeNull()
    })
  })
})

describe('appointment adapters', () => {
  describe('toAppointmentCreateRequest', () => {
    it('converts scheduledAt to ISO and nullifies empty optionals', () => {
      const values: AppointmentFormValues = {
        patientId: 'p-1',
        doctorId: 'doc-1',
        scheduledAt: '2025-06-20T10:00:00',
        durationMinutes: 30,
        chiefComplaint: ' Dolor de cabeza ',
        notes: '  ',
      }
      const result = toAppointmentCreateRequest(values)
      expect(result.patientId).toBe('p-1')
      expect(result.scheduledAt).toContain('T')
      expect(result.chiefComplaint).toBe('Dolor de cabeza')
      expect(result.notes).toBeNull()
    })

    it('handles undefined optionals', () => {
      const values: AppointmentFormValues = {
        patientId: 'p-1', doctorId: 'doc-1',
        scheduledAt: '2025-06-20T10:00:00', durationMinutes: 30,
      }
      const result = toAppointmentCreateRequest(values)
      expect(result.chiefComplaint).toBeNull()
      expect(result.notes).toBeNull()
    })
  })
})
