import { mockDelay } from '@/lib/mock-utils'
import {
  APPOINTMENTS_MOCK,
  DOCTORS_MOCK,
  INVOICES_MOCK,
  PATIENTS_MOCK,
  PAYMENTS_MOCK,
} from '@/mocks'

export interface DashboardMetrics {
  totalPatients: number
  activeDoctors: number
  appointmentsToday: number
  upcomingAppointments: number
  pendingInvoices: number
  overdueInvoices: number
  totalCollected: number
  pendingCollection: number
}

function isSameDay(dateA: Date, dateB: Date): boolean {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  )
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  await mockDelay()

  const now = new Date()

  const appointmentsToday = APPOINTMENTS_MOCK.filter((appointment) =>
    isSameDay(new Date(appointment.scheduledAt), now),
  ).length

  const upcomingAppointments = APPOINTMENTS_MOCK.filter(
    (appointment) =>
      new Date(appointment.scheduledAt).getTime() > now.getTime() &&
      (appointment.status === 'scheduled' || appointment.status === 'confirmed'),
  ).length

  const pendingInvoices = INVOICES_MOCK.filter(
    (invoice) => invoice.status === 'pending' || invoice.status === 'partial_paid',
  ).length

  const overdueInvoices = INVOICES_MOCK.filter((invoice) => invoice.status === 'overdue').length

  const totalCollected = PAYMENTS_MOCK.reduce((acc, payment) => acc + payment.amount, 0)

  const pendingCollection = INVOICES_MOCK.reduce((acc, invoice) => {
    if (invoice.status === 'cancelled' || invoice.status === 'paid') {
      return acc
    }

    const paidAmount = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0)
    return acc + Math.max(invoice.patientResponsibility - paidAmount, 0)
  }, 0)

  return {
    totalPatients: PATIENTS_MOCK.length,
    activeDoctors: DOCTORS_MOCK.filter((doctor) => doctor.isActive).length,
    appointmentsToday,
    upcomingAppointments,
    pendingInvoices,
    overdueInvoices,
    totalCollected,
    pendingCollection,
  }
}
