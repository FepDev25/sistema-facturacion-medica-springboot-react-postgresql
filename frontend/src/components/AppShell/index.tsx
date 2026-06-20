import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  LogOut,
  LayoutDashboard,
  Shield,
  Stethoscope,
  UserCircle,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLogout } from '@/features/auth/hooks/useAuth'
import { useAuthSession } from '@/features/auth/store/authSessionStore'
import type { AuthRole } from '@/features/auth/api/authApi'

interface AppShellProps {
  children: ReactNode
}

const ALL_NAV_ITEMS: Array<{
  to: string
  label: string
  icon: typeof LayoutDashboard
  roles: AuthRole[]
}> = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'] },
  { to: '/patients', label: 'Pacientes', icon: Users, roles: ['ADMIN', 'RECEPTIONIST'] },
  { to: '/doctors', label: 'Médicos', icon: Stethoscope, roles: ['ADMIN'] },
  { to: '/appointments', label: 'Citas', icon: CalendarDays, roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'] },
  { to: '/invoices', label: 'Facturas', icon: CreditCard, roles: ['ADMIN', 'RECEPTIONIST'] },
  { to: '/insurance', label: 'Seguros', icon: Shield, roles: ['ADMIN'] },
  { to: '/catalog', label: 'Catálogo', icon: ClipboardList, roles: ['ADMIN'] },
]

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate()
  const session = useAuthSession()
  const logout = useLogout()

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  const visibleNavItems = useMemo(
    () => (session.role ? ALL_NAV_ITEMS.filter((item) => item.roles.includes(session.role!)) : []),
    [session.role],
  )

  if (pathname === '/login') {
    return <div className="min-h-screen bg-background">{children}</div>
  }

  const roleLabel =
    session.role === 'ADMIN'
      ? 'Administrador'
      : session.role === 'DOCTOR'
        ? 'Doctor'
        : session.role === 'RECEPTIONIST'
          ? 'Recepción'
          : 'Sin rol'

  function handleLogout() {
    logout.mutate(undefined, {
      onSettled: () => {
        void navigate({ to: '/login', search: { redirect: undefined } })
      },
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden md:flex w-60 shrink-0 border-r border-border bg-sidebar">
          <div className="flex h-full w-full flex-col">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground leading-none">
                  Sistema
                </p>
                <h1 className="text-sm font-semibold text-foreground mt-1 leading-tight">
                  Facturación Médica
                </h1>
              </div>
            </div>

            <div className="px-3 pt-3">
              <Badge variant="outline" className="text-[11px]">
                {roleLabel}
              </Badge>
            </div>

            <nav className="p-3 space-y-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    activeProps={{
                      className:
                        'bg-primary/10 text-primary font-medium hover:bg-primary/10 hover:text-primary before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-primary',
                    }}
                    activeOptions={{ exact: item.to === '/' }}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="mt-auto p-3 border-t border-border space-y-1">
              <Link
                to="/profile"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                activeProps={{
                  className:
                    'bg-primary/10 text-primary font-medium hover:bg-primary/10 hover:text-primary',
                }}
              >
                <UserCircle className="h-4 w-4" />
                {session.username ?? 'Mi perfil'}
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleLogout}
                disabled={logout.isPending}
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="md:hidden border-b border-border bg-card px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Facturación Médica</p>
                <p className="text-xs text-muted-foreground mt-0.5">{roleLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="rounded-md border border-border p-1.5 text-muted-foreground"
                  activeProps={{
                    className: 'rounded-md border border-border p-1.5 bg-primary text-primary-foreground',
                  }}
                >
                  <UserCircle className="h-4 w-4" />
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  disabled={logout.isPending}
                >
                  <LogOut className="h-4 w-4" />
                  Salir
                </Button>
              </div>
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground whitespace-nowrap"
                  activeProps={{ className: 'rounded-md px-2.5 py-1 text-xs whitespace-nowrap bg-primary text-primary-foreground border-primary' }}
                  activeOptions={{ exact: item.to === '/' }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="h-full">{children}</div>
        </main>
      </div>
    </div>
  )
}
