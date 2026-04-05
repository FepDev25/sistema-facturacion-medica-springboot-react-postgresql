import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
  Outlet,
} from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { CatalogPage } from '@/features/catalog/components/CatalogPage'
import { AppointmentDetailPage } from '@/features/appointments/components/AppointmentDetailPage'
import { AppointmentsPage } from '@/features/appointments/components/AppointmentsPage'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { requireAuth } from '@/features/auth/guards/requireAuth'
import { isAuthenticated } from '@/features/auth/store/authSessionStore'
import { DashboardPage } from '@/features/dashboard/components/DashboardPage'
import { DoctorDetailPage } from '@/features/doctors/components/DoctorDetailPage'
import { DoctorsPage } from '@/features/doctors/components/DoctorsPage'
import { InvoiceDetailPage } from '@/features/invoices/components/InvoiceDetailPage'
import { InvoicesPage } from '@/features/invoices/components/InvoicesPage'
import { InsurancePage } from '@/features/insurance/components/InsurancePage'
import { MedicalRecordDetailPage } from '@/features/medical-records/components/MedicalRecordDetailPage'
import { PatientsPage } from '@/features/patients/components/PatientsPage'
import { PatientDetailPage } from '@/features/patients/components/PatientDetailPage'

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>) => ({
    redirect:
      typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => requireAuth('/'),
  component: DashboardPage,
})

const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/catalog',
  beforeLoad: () => requireAuth('/catalog'),
  component: CatalogPage,
})

const patientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/patients',
  beforeLoad: () => requireAuth('/patients'),
  component: PatientsPage,
})

const doctorsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/doctors',
  beforeLoad: () => requireAuth('/doctors'),
  component: DoctorsPage,
})

const appointmentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/appointments',
  beforeLoad: () => requireAuth('/appointments'),
  component: AppointmentsPage,
})

const invoicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invoices',
  beforeLoad: () => requireAuth('/invoices'),
  component: InvoicesPage,
})

const insuranceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/insurance',
  beforeLoad: () => requireAuth('/insurance'),
  component: InsurancePage,
})

const patientDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/patients/$id',
  beforeLoad: () => requireAuth('/patients'),
  component: PatientDetailPage,
})

const doctorDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/doctors/$id',
  beforeLoad: () => requireAuth('/doctors'),
  component: DoctorDetailPage,
})

const appointmentDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/appointments/$id',
  beforeLoad: () => requireAuth('/appointments'),
  component: AppointmentDetailPage,
})

const invoiceDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invoices/$id',
  beforeLoad: () => requireAuth('/invoices'),
  component: InvoiceDetailPage,
})

const medicalRecordDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/medical-records/$id',
  beforeLoad: () => requireAuth('/patients'),
  component: MedicalRecordDetailPage,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
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
  medicalRecordDetailRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
