import { lazy, Suspense } from 'react'
import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
  Outlet,
} from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { DetailSkeleton } from '@/components/DetailState'
import { requireAuth, requireRole } from '@/features/auth/guards/requireAuth'
import { isAuthenticated } from '@/features/auth/store/authSessionStore'

// Cada pagina se carga como chunk independiente. Los paneles de IA y
// react-markdown quedan dentro de los chunks de las paginas que los usan.
const AiLabPage = lazy(() =>
  import('@/features/ai/components/AiLabPage').then((module) => ({ default: module.AiLabPage })),
)
const AppointmentDetailPage = lazy(() =>
  import('@/features/appointments/components/AppointmentDetailPage').then((module) => ({
    default: module.AppointmentDetailPage,
  })),
)
const AppointmentsPage = lazy(() =>
  import('@/features/appointments/components/AppointmentsPage').then((module) => ({
    default: module.AppointmentsPage,
  })),
)
const CatalogPage = lazy(() =>
  import('@/features/catalog/components/CatalogPage').then((module) => ({
    default: module.CatalogPage,
  })),
)
const DashboardPage = lazy(() =>
  import('@/features/dashboard/components/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
)
const DoctorDetailPage = lazy(() =>
  import('@/features/doctors/components/DoctorDetailPage').then((module) => ({
    default: module.DoctorDetailPage,
  })),
)
const DoctorsPage = lazy(() =>
  import('@/features/doctors/components/DoctorsPage').then((module) => ({
    default: module.DoctorsPage,
  })),
)
const ForbiddenPage = lazy(() =>
  import('@/features/auth/components/ForbiddenPage').then((module) => ({
    default: module.ForbiddenPage,
  })),
)
const InsurancePage = lazy(() =>
  import('@/features/insurance/components/InsurancePage').then((module) => ({
    default: module.InsurancePage,
  })),
)
const InvoiceDetailPage = lazy(() =>
  import('@/features/invoices/components/InvoiceDetailPage').then((module) => ({
    default: module.InvoiceDetailPage,
  })),
)
const InvoicesPage = lazy(() =>
  import('@/features/invoices/components/InvoicesPage').then((module) => ({
    default: module.InvoicesPage,
  })),
)
const LoginPage = lazy(() =>
  import('@/features/auth/components/LoginPage').then((module) => ({
    default: module.LoginPage,
  })),
)
const MedicalRecordDetailPage = lazy(() =>
  import('@/features/medical-records/components/MedicalRecordDetailPage').then((module) => ({
    default: module.MedicalRecordDetailPage,
  })),
)
const PatientDetailPage = lazy(() =>
  import('@/features/patients/components/PatientDetailPage').then((module) => ({
    default: module.PatientDetailPage,
  })),
)
const PatientsPage = lazy(() =>
  import('@/features/patients/components/PatientsPage').then((module) => ({
    default: module.PatientsPage,
  })),
)
const ProfilePage = lazy(() =>
  import('@/features/auth/components/ProfilePage').then((module) => ({
    default: module.ProfilePage,
  })),
)

const rootRoute = createRootRoute({
  component: () => (
    <Suspense fallback={<DetailSkeleton label="Cargando aplicación" />}>
      <AppShell>
        <Suspense fallback={<DetailSkeleton label="Cargando página" />}>
          <Outlet />
        </Suspense>
      </AppShell>
    </Suspense>
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
  beforeLoad: () => requireRole(['ADMIN'], '/catalog'),
  component: CatalogPage,
})

const patientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/patients',
  beforeLoad: () => requireRole(['ADMIN', 'RECEPTIONIST'], '/patients'),
  component: PatientsPage,
})

const doctorsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/doctors',
  beforeLoad: () => requireRole(['ADMIN'], '/doctors'),
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
  beforeLoad: () => requireRole(['ADMIN', 'RECEPTIONIST'], '/invoices'),
  component: InvoicesPage,
})

const insuranceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/insurance',
  beforeLoad: () => requireRole(['ADMIN'], '/insurance'),
  component: InsurancePage,
})

const patientDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/patients/$id',
  beforeLoad: () => requireRole(['ADMIN', 'RECEPTIONIST'], '/patients'),
  component: PatientDetailPage,
})

const doctorDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/doctors/$id',
  beforeLoad: () => requireRole(['ADMIN'], '/doctors'),
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
  beforeLoad: () => requireRole(['ADMIN', 'RECEPTIONIST'], '/invoices'),
  component: InvoiceDetailPage,
})

const medicalRecordDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/medical-records/$id',
  beforeLoad: () => requireAuth('/patients'),
  component: MedicalRecordDetailPage,
})

const forbiddenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forbidden',
  validateSearch: (search: Record<string, unknown>) => ({
    from: typeof search.from === 'string' ? search.from : undefined,
  }),
  beforeLoad: () => requireAuth('/forbidden'),
  component: ForbiddenPage,
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: () => requireAuth('/profile'),
  component: ProfilePage,
})

const aiLabRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ai-lab',
  beforeLoad: () => requireRole(['ADMIN'], '/ai-lab'),
  component: AiLabPage,
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
  profileRoute,
  aiLabRoute,
  forbiddenRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
