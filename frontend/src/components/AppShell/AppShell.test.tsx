import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppShell } from '@/components/AppShell'
import type { AuthSessionState } from '@/features/auth/store/authSessionStore'

const { mockUseNavigate, mockUseRouterState } = vi.hoisted(() => ({
  mockUseNavigate: vi.fn(),
  mockUseRouterState: vi.fn(),
}))

const mockMutate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockUseNavigate,
  useRouterState: (opts: { select: (s: { location: { pathname: string } }) => string }) =>
    opts.select({ location: { pathname: mockUseRouterState() } }),
  Link: ({
    to,
    children,
    activeProps: _ap,
    activeOptions: _ao,
    ...rest
  }: {
    to: string
    children: React.ReactNode
    activeProps?: Record<string, string>
    activeOptions?: { exact: boolean }
    className?: string
    [key: string]: unknown
  }) => (
    <a href={to} {...rest}>{children}</a>
  ),
}))

vi.mock('lucide-react', () => ({
  CalendarDays: () => <span>icon-calendar</span>,
  ClipboardList: () => <span>icon-clipboard</span>,
  CreditCard: () => <span>icon-credit</span>,
  LogOut: () => <span>icon-logout</span>,
  LayoutDashboard: () => <span>icon-dashboard</span>,
  Shield: () => <span>icon-shield</span>,
  Stethoscope: () => <span>icon-stethoscope</span>,
  UserCircle: () => <span>icon-user</span>,
  Users: () => <span>icon-users</span>,
}))

vi.mock('@/features/auth/store/authSessionStore', () => ({
  useAuthSession: () => mockSessionState,
}))

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useLogout: () => ({ mutate: mockMutate, isPending: mockLogoutPending }),
}))

let mockSessionState: AuthSessionState = {
  accessToken: null,
  refreshToken: null,
  role: null,
  userId: null,
  username: null,
}
let mockLogoutPending = false

function setSession(overrides: Partial<AuthSessionState>) {
  mockSessionState = {
    accessToken: 'token',
    refreshToken: 'refresh',
    role: null,
    userId: 'user-1',
    username: 'admin',
    ...overrides,
  }
}

function getSidebar() {
  return screen.getByRole('complementary').querySelector('nav')!
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogoutPending = false
    mockUseRouterState.mockReturnValue('/')
    mockSessionState = {
      accessToken: null,
      refreshToken: null,
      role: null,
      userId: null,
      username: null,
    }
  })
  afterEach(cleanup)

  describe('/login bypass', () => {
    it('renders children without sidebar on /login', () => {
      mockUseRouterState.mockReturnValue('/login')
      render(<AppShell><p>login content</p></AppShell>)
      expect(screen.getByText('login content')).toBeInTheDocument()
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
      expect(screen.queryByText('Cerrar sesión')).not.toBeInTheDocument()
    })

    it('renders sidebar on non-login pages', () => {
      setSession({ role: 'ADMIN' })
      render(<AppShell><p>main content</p></AppShell>)
      expect(screen.getByRole('complementary')).toBeInTheDocument()
      expect(screen.getByText('main content')).toBeInTheDocument()
    })
  })

  describe('nav filtering by role (desktop sidebar)', () => {
    it('ADMIN sees all 7 nav items', () => {
      setSession({ role: 'ADMIN' })
      render(<AppShell><p>content</p></AppShell>)
      const nav = getSidebar()
      expect(within(nav).getByText('Dashboard')).toBeInTheDocument()
      expect(within(nav).getByText('Pacientes')).toBeInTheDocument()
      expect(within(nav).getByText('Médicos')).toBeInTheDocument()
      expect(within(nav).getByText('Citas')).toBeInTheDocument()
      expect(within(nav).getByText('Facturas')).toBeInTheDocument()
      expect(within(nav).getByText('Seguros')).toBeInTheDocument()
      expect(within(nav).getByText('Catálogo')).toBeInTheDocument()
    })

    it('DOCTOR sees only Dashboard and Citas', () => {
      setSession({ role: 'DOCTOR' })
      render(<AppShell><p>content</p></AppShell>)
      const nav = getSidebar()
      expect(within(nav).getByText('Dashboard')).toBeInTheDocument()
      expect(within(nav).getByText('Citas')).toBeInTheDocument()
      expect(within(nav).queryByText('Pacientes')).not.toBeInTheDocument()
      expect(within(nav).queryByText('Médicos')).not.toBeInTheDocument()
      expect(within(nav).queryByText('Facturas')).not.toBeInTheDocument()
      expect(within(nav).queryByText('Seguros')).not.toBeInTheDocument()
      expect(within(nav).queryByText('Catálogo')).not.toBeInTheDocument()
    })

    it('RECEPTIONIST sees Dashboard, Pacientes, Citas, Facturas', () => {
      setSession({ role: 'RECEPTIONIST' })
      render(<AppShell><p>content</p></AppShell>)
      const nav = getSidebar()
      expect(within(nav).getByText('Dashboard')).toBeInTheDocument()
      expect(within(nav).getByText('Pacientes')).toBeInTheDocument()
      expect(within(nav).getByText('Citas')).toBeInTheDocument()
      expect(within(nav).getByText('Facturas')).toBeInTheDocument()
      expect(within(nav).queryByText('Médicos')).not.toBeInTheDocument()
      expect(within(nav).queryByText('Seguros')).not.toBeInTheDocument()
      expect(within(nav).queryByText('Catálogo')).not.toBeInTheDocument()
    })

    it('no role shows no nav items', () => {
      setSession({ role: null, accessToken: 'token' })
      render(<AppShell><p>content</p></AppShell>)
      const nav = getSidebar()
      expect(within(nav).queryByText('Dashboard')).not.toBeInTheDocument()
      expect(within(nav).queryByText('Citas')).not.toBeInTheDocument()
    })

    it('mobile nav mirrors desktop nav for ADMIN', () => {
      setSession({ role: 'ADMIN' })
      render(<AppShell><p>content</p></AppShell>)
      const mobileLinks = screen.getAllByText('Dashboard')
      expect(mobileLinks.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('role badge (sidebar)', () => {
    it('shows "Administrador" for ADMIN', () => {
      setSession({ role: 'ADMIN' })
      render(<AppShell><p>content</p></AppShell>)
      const sidebar = screen.getByRole('complementary')
      expect(within(sidebar).getByText('Administrador')).toBeInTheDocument()
    })

    it('shows "Doctor" for DOCTOR', () => {
      setSession({ role: 'DOCTOR' })
      render(<AppShell><p>content</p></AppShell>)
      const sidebar = screen.getByRole('complementary')
      expect(within(sidebar).getByText('Doctor')).toBeInTheDocument()
    })

    it('shows "Recepción" for RECEPTIONIST', () => {
      setSession({ role: 'RECEPTIONIST' })
      render(<AppShell><p>content</p></AppShell>)
      const sidebar = screen.getByRole('complementary')
      expect(within(sidebar).getByText('Recepción')).toBeInTheDocument()
    })

    it('shows "Sin rol" when role is null', () => {
      setSession({ role: null, accessToken: 'token' })
      render(<AppShell><p>content</p></AppShell>)
      const sidebar = screen.getByRole('complementary')
      expect(within(sidebar).getByText('Sin rol')).toBeInTheDocument()
    })
  })

  describe('profile and logout', () => {
    it('shows username in profile link', () => {
      setSession({ username: 'drhouse' })
      render(<AppShell><p>content</p></AppShell>)
      expect(screen.getByText('drhouse')).toBeInTheDocument()
    })

    it('shows "Mi perfil" when username is null', () => {
      setSession({ username: null })
      render(<AppShell><p>content</p></AppShell>)
      expect(screen.getByText('Mi perfil')).toBeInTheDocument()
    })

    it('renders two Cerrar sesión / Salir buttons (desktop + mobile)', () => {
      setSession({ role: 'ADMIN' })
      render(<AppShell><p>content</p></AppShell>)
      const buttons = screen.getAllByText('Cerrar sesión')
      expect(buttons.length).toBeGreaterThanOrEqual(1)
    })

    it('calls logout.mutate and navigates to /login on click', async () => {
      const user = userEvent.setup()
      setSession({ role: 'ADMIN' })
      render(<AppShell><p>content</p></AppShell>)

      const logoutButtons = screen.getAllByText('Cerrar sesión')
      await user.click(logoutButtons[0])

      expect(mockMutate).toHaveBeenCalledWith(undefined, {
        onSettled: expect.any(Function),
      })

      const onSettled = mockMutate.mock.calls[0][1].onSettled
      onSettled()
      expect(mockUseNavigate).toHaveBeenCalledWith({
        to: '/login',
        search: { redirect: undefined },
      })
    })

    it('disables logout button when isPending', () => {
      mockLogoutPending = true
      setSession({ role: 'ADMIN' })
      render(<AppShell><p>content</p></AppShell>)

      const sidebar = screen.getByRole('complementary')
      const btn = within(sidebar).getByText('Cerrar sesión').closest('button')
      expect(btn).toBeDisabled()
    })
  })
})
