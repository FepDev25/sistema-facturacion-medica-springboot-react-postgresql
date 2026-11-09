import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'

const SECTION_LABELS: Record<string, string> = {
  patients: 'Pacientes',
  doctors: 'Médicos',
  appointments: 'Citas',
  invoices: 'Facturas',
  insurance: 'Seguros',
  catalog: 'Catálogo',
  'medical-records': 'Expedientes',
  profile: 'Mi perfil',
  forbidden: 'Sin acceso',
}

function isId(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f-]{4,}$/i.test(segment)
}

export function Breadcrumbs() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  if (pathname === '/') {
    return null
  }

  const segments = pathname.split('/').filter(Boolean)
  const items = segments.map((segment, index) => {
    const to = '/' + segments.slice(0, index + 1).join('/')
    return {
      to,
      label: isId(segment) ? 'Detalle' : (SECTION_LABELS[segment] ?? decodeURIComponent(segment)),
      current: index === segments.length - 1,
    }
  })

  return (
    <nav aria-label="Breadcrumb" className="border-b border-border bg-background px-6 py-2">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <li>
          <Link to="/" className="transition-colors hover:text-foreground">
            Inicio
          </Link>
        </li>
        {items.map((item) => (
          <li key={item.to} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            {item.current ? (
              <span className="font-medium text-foreground">{item.label}</span>
            ) : (
              <Link to={item.to as never} className="transition-colors hover:text-foreground">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
