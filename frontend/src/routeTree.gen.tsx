import {
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
} from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { CatalogPage } from '@/features/catalog/components/CatalogPage'
import { AppointmentDetailPage } from '@/features/appointments/components/AppointmentDetailPage'
import { AppointmentsPage } from '@/features/appointments/components/AppointmentsPage'
import { DashboardPage } from '@/features/dashboard/components/DashboardPage'
import { DoctorDetailPage } from '@/features/doctors/components/DoctorDetailPage'
import { DoctorsPage } from '@/features/doctors/components/DoctorsPage'
import { InvoiceDetailPage } from '@/features/invoices/components/InvoiceDetailPage'
import { InvoicesPage } from '@/features/invoices/components/InvoicesPage'
import { InsurancePage } from '@/features/insurance/components/InsurancePage'
import { PatientsPage } from '@/features/patients/components/PatientsPage'
import { PatientDetailPage } from '@/features/patients/components/PatientDetailPage'

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
})

const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/catalog',
  component: CatalogPage,
})

const patientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/patients',
  component: PatientsPage,
})

const doctorsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/doctors',
  component: DoctorsPage,
})

const appointmentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/appointments',
  component: AppointmentsPage,
})

const invoicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invoices',
  component: InvoicesPage,
})

const insuranceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/insurance',
  component: InsurancePage,
})

const patientDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/patients/$id',
  component: PatientDetailPage,
})

const doctorDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/doctors/$id',
  component: DoctorDetailPage,
})

const appointmentDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/appointments/$id',
  component: AppointmentDetailPage,
})

const invoiceDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invoices/$id',
  component: InvoiceDetailPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  catalogRoute,
  patientsRoute,
  doctorsRoute,
  appointmentsRoute,
  invoicesRoute,
  insuranceRoute,
  patientDetailRoute,
  doctorDetailRoute,
  appointmentDetailRoute,
  invoiceDetailRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
