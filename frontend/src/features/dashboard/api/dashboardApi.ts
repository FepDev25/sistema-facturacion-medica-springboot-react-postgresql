import * as appointmentsApi from '@/features/appointments/api/appointmentsApi'
import * as doctorsApi from '@/features/doctors/api/doctorsApi'
import * as invoicesApi from '@/features/invoices/api/invoicesApi'
import * as patientsApi from '@/features/patients/api/patientsApi'

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
  const [patientsPage, doctorsPage, appointmentsPage, invoicesPage] = await Promise.all([
    patientsApi.getPatients({ page: 0, size: 1 }),
    doctorsApi.getDoctors({ active: true, page: 0, size: 1 }),
    appointmentsApi.getAppointments({ page: 0, size: 200 }),
    invoicesApi.getInvoices({ page: 0, size: 200 }),
  ])

  const appointments = appointmentsPage.content
  const invoices = invoicesPage.content
  const now = new Date()

  const appointmentsToday = appointments.filter((appointment) =>
    isSameDay(new Date(appointment.scheduledAt), now),
  ).length

  const upcomingAppointments = appointments.filter(
    (appointment) =>
      new Date(appointment.scheduledAt).getTime() > now.getTime() &&
      (appointment.status === 'scheduled' || appointment.status === 'confirmed'),
  ).length

  const pendingInvoices = invoices.filter(
    (invoice) => invoice.status === 'pending' || invoice.status === 'partial_paid',
  ).length

  const overdueInvoices = invoices.filter((invoice) => invoice.status === 'overdue').length

  const totalCollected = invoices.reduce((acc, invoice) => {
    if (invoice.status === 'paid') {
      return acc + invoice.patientResponsibility
    }

    return acc
  }, 0)

  const pendingCollection = invoices.reduce((acc, invoice) => {
    if (invoice.status === 'cancelled' || invoice.status === 'paid') {
      return acc
    }

    return acc + invoice.patientResponsibility
  }, 0)

  return {
    totalPatients: patientsPage.totalElements,
    activeDoctors: doctorsPage.totalElements,
    appointmentsToday,
    upcomingAppointments,
    pendingInvoices,
    overdueInvoices,
    totalCollected,
    pendingCollection,
  }
}
