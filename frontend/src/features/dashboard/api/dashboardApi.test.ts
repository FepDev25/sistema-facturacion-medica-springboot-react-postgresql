import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDashboardMetrics } from '@/features/dashboard/api/dashboardApi'

vi.mock('@/features/patients/api/patientsApi', () => ({
  getPatients: vi.fn(),
}))

vi.mock('@/features/doctors/api/doctorsApi', () => ({
  getDoctors: vi.fn(),
}))

vi.mock('@/features/appointments/api/appointmentsApi', () => ({
  getAppointments: vi.fn(),
}))

vi.mock('@/features/invoices/api/invoicesApi', () => ({
  getInvoices: vi.fn(),
}))

import { getPatients } from '@/features/patients/api/patientsApi'
import { getDoctors } from '@/features/doctors/api/doctorsApi'
import { getAppointments } from '@/features/appointments/api/appointmentsApi'
import { getInvoices } from '@/features/invoices/api/invoicesApi'

const mockGetPatients = vi.mocked(getPatients)
const mockGetDoctors = vi.mocked(getDoctors)
const mockGetAppointments = vi.mocked(getAppointments)
const mockGetInvoices = vi.mocked(getInvoices)

beforeEach(() => {
  vi.clearAllMocks()
})

function todayString() {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

function makeAppointment(overrides: { scheduledAt: string; status: string }) {
  return {
    id: 'apt-1', patientId: 'p-1', patientFirstName: 'Juan', patientLastName: 'Perez',
    doctorId: 'doc-1', doctorFirstName: 'Maria', doctorLastName: 'Garcia',
    ...overrides, durationMinutes: 30, chiefComplaint: null, notes: null, createdAt: '2025-01-01T00:00:00Z',
  }
}

function makeInvoice(overrides: { status: string; patientResponsibility: number }) {
  return {
    id: 'inv-1', patientId: 'p-1', patientFirstName: 'Juan', patientLastName: 'Perez',
    invoiceNumber: 'INV-001', total: 1000, patientResponsibility: overrides.patientResponsibility,
    insuranceCoverage: 0, ...overrides, issueDate: '2025-01-01', dueDate: '2025-02-01', createdAt: '2025-01-01T00:00:00Z',
  }
}

describe('dashboard API', () => {
  it('aggregates metrics from 4 endpoints', async () => {
    mockGetPatients.mockResolvedValue({ content: [], totalElements: 42, totalPages: 1, number: 0, size: 1, first: true, last: true, empty: true })
    mockGetDoctors.mockResolvedValue({ content: [], totalElements: 5, totalPages: 1, number: 0, size: 1, first: true, last: true, empty: true })
    mockGetAppointments.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 200, first: true, last: true, empty: true })
    mockGetInvoices.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 200, first: true, last: true, empty: true })

    const result = await getDashboardMetrics()

    expect(result.totalPatients).toBe(42)
    expect(result.activeDoctors).toBe(5)
    expect(result.appointmentsToday).toBe(0)
    expect(result.upcomingAppointments).toBe(0)
    expect(result.pendingInvoices).toBe(0)
    expect(result.overdueInvoices).toBe(0)
    expect(result.totalCollected).toBe(0)
    expect(result.pendingCollection).toBe(0)
  })

  it('counts appointmentsToday for same-day appointments', async () => {
    const now = new Date()
    const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T12:00:00`

    mockGetPatients.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 1, first: true, last: true, empty: true })
    mockGetDoctors.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 1, first: true, last: true, empty: true })
    mockGetAppointments.mockResolvedValue({
      content: [
        makeAppointment({ scheduledAt: localDateStr, status: 'completed' }),
        makeAppointment({ scheduledAt: '2020-01-01T12:00:00', status: 'completed' }),
      ], totalElements: 2, totalPages: 1, number: 0, size: 200, first: true, last: true, empty: false,
    })
    mockGetInvoices.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 200, first: true, last: true, empty: true })

    const result = await getDashboardMetrics()
    expect(result.appointmentsToday).toBe(1)
  })

  it('counts upcomingAppointments only for scheduled/confirmed future', async () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    const past = new Date(Date.now() - 86400000).toISOString()

    mockGetPatients.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 1, first: true, last: true, empty: true })
    mockGetDoctors.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 1, first: true, last: true, empty: true })
    mockGetAppointments.mockResolvedValue({
      content: [
        makeAppointment({ scheduledAt: future, status: 'scheduled' }),
        makeAppointment({ scheduledAt: future, status: 'confirmed' }),
        makeAppointment({ scheduledAt: future, status: 'in_progress' }),
        makeAppointment({ scheduledAt: past, status: 'scheduled' }),
      ], totalElements: 4, totalPages: 1, number: 0, size: 200, first: true, last: true, empty: false,
    })
    mockGetInvoices.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 200, first: true, last: true, empty: true })

    const result = await getDashboardMetrics()
    expect(result.upcomingAppointments).toBe(2)
  })

  it('counts pending and overdue invoices', async () => {
    mockGetPatients.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 1, first: true, last: true, empty: true })
    mockGetDoctors.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 1, first: true, last: true, empty: true })
    mockGetAppointments.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 200, first: true, last: true, empty: true })
    mockGetInvoices.mockResolvedValue({
      content: [
        makeInvoice({ status: 'pending', patientResponsibility: 500 }),
        makeInvoice({ status: 'partial_paid', patientResponsibility: 300 }),
        makeInvoice({ status: 'overdue', patientResponsibility: 200 }),
        makeInvoice({ status: 'paid', patientResponsibility: 100 }),
      ], totalElements: 4, totalPages: 1, number: 0, size: 200, first: true, last: true, empty: false,
    })

    const result = await getDashboardMetrics()
    expect(result.pendingInvoices).toBe(2)
    expect(result.overdueInvoices).toBe(1)
  })

  it('totalCollected sums only paid invoices', async () => {
    mockGetPatients.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 1, first: true, last: true, empty: true })
    mockGetDoctors.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 1, first: true, last: true, empty: true })
    mockGetAppointments.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 200, first: true, last: true, empty: true })
    mockGetInvoices.mockResolvedValue({
      content: [
        makeInvoice({ status: 'paid', patientResponsibility: 1000 }),
        makeInvoice({ status: 'paid', patientResponsibility: 500 }),
        makeInvoice({ status: 'pending', patientResponsibility: 800 }),
      ], totalElements: 3, totalPages: 1, number: 0, size: 200, first: true, last: true, empty: false,
    })

    const result = await getDashboardMetrics()
    expect(result.totalCollected).toBe(1500)
  })

  it('pendingCollection excludes cancelled, paid, and overdue', async () => {
    mockGetPatients.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 1, first: true, last: true, empty: true })
    mockGetDoctors.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 1, first: true, last: true, empty: true })
    mockGetAppointments.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 200, first: true, last: true, empty: true })
    mockGetInvoices.mockResolvedValue({
      content: [
        makeInvoice({ status: 'pending', patientResponsibility: 500 }),
        makeInvoice({ status: 'partial_paid', patientResponsibility: 300 }),
        makeInvoice({ status: 'cancelled', patientResponsibility: 100 }),
        makeInvoice({ status: 'paid', patientResponsibility: 200 }),
        makeInvoice({ status: 'overdue', patientResponsibility: 400 }),
      ], totalElements: 5, totalPages: 1, number: 0, size: 200, first: true, last: true, empty: false,
    })

    const result = await getDashboardMetrics()
    expect(result.pendingCollection).toBe(800)
  })

  it('calls APIs with correct params', async () => {
    mockGetPatients.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 1, first: true, last: true, empty: true })
    mockGetDoctors.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 1, first: true, last: true, empty: true })
    mockGetAppointments.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 200, first: true, last: true, empty: true })
    mockGetInvoices.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 200, first: true, last: true, empty: true })

    await getDashboardMetrics()

    expect(mockGetPatients).toHaveBeenCalledWith({ page: 0, size: 1 })
    expect(mockGetDoctors).toHaveBeenCalledWith({ active: true, page: 0, size: 1 })
    expect(mockGetAppointments).toHaveBeenCalledWith({ page: 0, size: 200 })
    expect(mockGetInvoices).toHaveBeenCalledWith({ page: 0, size: 200 })
  })
})
