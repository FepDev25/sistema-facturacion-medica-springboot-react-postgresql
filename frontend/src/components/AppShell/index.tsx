import type { ReactNode } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  LogOut,
  LayoutDashboard,
  Shield,
  Stethoscope,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLogout } from '@/features/auth/hooks/useAuth'
import { useAuthSession } from '@/features/auth/store/authSessionStore'

interface AppShellProps {
  children: ReactNode
}

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    to: '/patients',
    label: 'Pacientes',
    icon: Users,
  },
  {
    to: '/doctors',
    label: 'Médicos',
    icon: Stethoscope,
  },
  {
    to: '/appointments',
    label: 'Citas',
    icon: CalendarDays,
  },
  {
    to: '/invoices',
    label: 'Facturas',
    icon: CreditCard,
  },
  {
    to: '/insurance',
    label: 'Seguros',
    icon: Shield,
  },
  {
    to: '/catalog',
    label: 'Catálogo',
    icon: ClipboardList,
  },
] as const

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate()
  const session = useAuthSession()
  const logout = useLogout()

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  if (pathname === '/login') {
    return <div className="min-h-screen bg-slate-50">{children}</div>
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
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <aside className="hidden md:flex w-60 shrink-0 border-r border-border bg-white">
          <div className="flex h-full w-full flex-col">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-xs uppercase tracking-wider text-slate-500">Sistema</p>
              <h1 className="text-sm font-semibold text-slate-900 mt-1">Facturación Médica</h1>
              <Badge variant="outline" className="mt-2 text-[11px]">
                {roleLabel}
              </Badge>
            </div>

            <nav className="p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    activeProps={{
                      className:
                        'bg-primary/10 text-primary font-medium hover:bg-primary/10 hover:text-primary',
                    }}
                    activeOptions={{ exact: item.to === '/' }}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="mt-auto p-3 border-t border-border">
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
          <div className="md:hidden border-b border-border bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Facturación Médica</p>
                <p className="text-xs text-slate-500 mt-0.5">{roleLabel}</p>
              </div>
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
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-md border border-border px-2.5 py-1 text-xs text-slate-600 whitespace-nowrap"
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
