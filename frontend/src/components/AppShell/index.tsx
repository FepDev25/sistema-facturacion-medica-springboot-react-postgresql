import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { LogOut, Menu, Search, Shield, UserCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { CommandPalette } from '@/components/CommandPalette'
import { useLogout } from '@/features/auth/hooks/useAuth'
import { useAuthSession } from '@/features/auth/store/authSessionStore'
import { ALL_NAV_ITEMS } from './navItems'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate()
  const session = useAuthSession()
  const logout = useLogout()
  const [commandOpen, setCommandOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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

  const navLinks = visibleNavItems.map((item) => {
    const Icon = item.icon
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={() => setMobileNavOpen(false)}
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
  })

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

            <div className="px-3 pt-3 space-y-2">
              <Badge variant="outline" className="text-[11px]">
                {roleLabel}
              </Badge>
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">Buscar…</span>
                <kbd className="rounded border border-border px-1 py-0.5 text-[10px]">⌘K</kbd>
              </button>
            </div>

            <nav className="p-3 space-y-1" aria-label="Navegación principal">
              {navLinks}
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
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Shield className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    Facturación Médica
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{roleLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Buscar"
                  onClick={() => setCommandOpen(true)}
                >
                  <Search className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Abrir menú"
                  onClick={() => setMobileNavOpen(true)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Breadcrumbs />
          <div className="h-full">{children}</div>
        </main>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-primary" />
              Facturación Médica
            </SheetTitle>
            <SheetDescription className="text-xs">{roleLabel}</SheetDescription>
          </SheetHeader>

          <nav className="flex-1 space-y-1 p-3" aria-label="Navegación principal móvil">
            {navLinks}
          </nav>

          <div className="border-t border-border p-3 space-y-1">
            <Link
              to="/profile"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
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
        </SheetContent>
      </Sheet>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}
