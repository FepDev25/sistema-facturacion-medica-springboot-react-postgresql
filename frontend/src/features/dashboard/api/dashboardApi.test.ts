import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }))

vi.mock('@/lib/axios', () => ({
  apiClient: { get: mockGet },
}))

import { getDashboardMetrics } from '@/features/dashboard/api/dashboardApi'

const metrics = {
  totalPatients: 42,
  activeDoctors: 5,
  appointmentsToday: 3,
  upcomingAppointments: 7,
  pendingInvoices: 4,
  overdueInvoices: 2,
  totalCollected: 1500.5,
  pendingCollection: 800.25,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('dashboard API', () => {
  it('consume el endpoint agregado del backend', async () => {
    mockGet.mockResolvedValue({ data: metrics })

    const result = await getDashboardMetrics()

    expect(mockGet).toHaveBeenCalledWith('/dashboard/metrics')
    expect(result).toEqual(metrics)
  })

  it('propaga el error si el endpoint falla', async () => {
    mockGet.mockRejectedValue(new Error('boom'))

    await expect(getDashboardMetrics()).rejects.toThrow('boom')
  })
})
