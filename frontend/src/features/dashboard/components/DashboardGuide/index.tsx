import { useState, type ComponentType } from 'react'
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  CreditCard,
  MessageSquareText,
  Settings2,
  Sparkles,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { AuthRole } from '@/features/auth/api/authApi'

const COLLAPSED_KEY = 'sfm.dashboard.guide.collapsed'

function readCollapsedPreference(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

interface GuideCard {
  icon: ComponentType<{ className?: string }>
  title: string
  body: string
}

interface RoleGuide {
  label: string
  intro: string
  cards: GuideCard[]
}

const GUIDES: Record<AuthRole, RoleGuide> = {
  ADMIN: {
    label: 'Administrador',
    intro:
      'Tienes acceso completo: configuración maestra del sistema, supervisión clínica y control financiero.',
    cards: [
      {
        icon: Settings2,
        title: 'Configuración maestra',
        body: 'Da de alta médicos, servicios, medicamentos y aseguradoras. La edición de catálogos, médicos y seguros es exclusiva del rol Administrador.',
      },
      {
        icon: CalendarCheck,
        title: 'Flujo operativo',
        body: 'El ciclo es Paciente → Cita → Consulta. Al completar una cita se generan de forma automática el expediente clínico y una factura en borrador.',
      },
      {
        icon: CreditCard,
        title: 'Facturación y cobranza',
        body: 'Confirma facturas, aplica la cobertura de seguro (se recalcula en tiempo real) y registra los pagos hasta saldar la cuenta del paciente.',
      },
      {
        icon: Sparkles,
        title: '4 asistentes de IA',
        body: 'Sugerencia de códigos CIE-10, extracción de notas clínicas, consulta de historial en lenguaje natural y sugerencia de ítems de factura.',
      },
    ],
  },
  DOCTOR: {
    label: 'Doctor',
    intro:
      'Tu espacio es la atención clínica: gestiona tu agenda y documenta cada consulta con apoyo de IA.',
    cards: [
      {
        icon: CalendarDays,
        title: 'Tu agenda',
        body: 'Desde Citas confirmas, inicias y completas tus consultas. Solo puedes completar las citas que te pertenecen.',
      },
      {
        icon: ClipboardCheck,
        title: 'Completar la consulta',
        body: 'Al completar registras notas clínicas y signos vitales. En una sola operación se crean el expediente y la factura en borrador.',
      },
      {
        icon: Sparkles,
        title: 'IA clínica',
        body: 'Extrae diagnósticos y prescripciones de tus notas, sugiere códigos CIE-10 y consulta el historial del paciente en lenguaje natural.',
      },
      {
        icon: AlertTriangle,
        title: 'Alertas de alergias',
        body: 'El sistema resalta las alergias del paciente en cada punto de contacto clínico para evitar prescripciones peligrosas.',
      },
    ],
  },
  RECEPTIONIST: {
    label: 'Recepción',
    intro:
      'Eres la puerta de entrada del sistema: registras pacientes, agendas citas y gestionas la cobranza.',
    cards: [
      {
        icon: Users,
        title: 'Registro de pacientes',
        body: 'Da de alta y actualiza la información demográfica de los pacientes y sus pólizas de seguro.',
      },
      {
        icon: CalendarPlus,
        title: 'Agenda de citas',
        body: 'Programa citas validando la disponibilidad del médico para evitar solapamientos de horario.',
      },
      {
        icon: CreditCard,
        title: 'Cobranza',
        body: 'Consulta las facturas y registra los pagos. La suma de pagos no puede exceder el total de la factura.',
      },
      {
        icon: MessageSquareText,
        title: 'Apoyo de IA',
        body: 'Desde la ficha del paciente puedes consultar su historial clínico completo haciendo preguntas en lenguaje natural.',
      },
    ],
  },
}

export function DashboardGuide({ role }: { role: AuthRole | null }) {
  const [collapsed, setCollapsed] = useState(readCollapsedPreference)

  if (!role) return null
  const guide = GUIDES[role]
  if (!guide) return null

  function toggle() {
    setCollapsed((previous) => {
      const next = !previous
      try {
        window.localStorage.setItem(COLLAPSED_KEY, String(next))
      } catch {
        // localStorage puede no estar disponible; la preferencia es best-effort
      }
      return next
    })
  }

  return (
    <section>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Guía rápida · {guide.label}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{guide.intro}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-xs"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls="dashboard-guide-cards"
        >
          {collapsed ? (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Mostrar guía
            </>
          ) : (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Ocultar guía
            </>
          )}
        </Button>
      </div>

      {collapsed ? null : (
        <div id="dashboard-guide-cards" className="grid gap-3 md:grid-cols-2">
          {guide.cards.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="p-4">
              <div className="flex gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
