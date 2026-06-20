import type { ComponentType } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Activity,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileWarning,
  Shield,
  Stethoscope,
  Users,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn, formatCurrency } from '@/lib/utils'
import { useRolePermissions } from '@/features/auth/hooks/useRolePermissions'
import { useDashboardMetrics } from '../../hooks/useDashboard'
import { DashboardGuide } from '../DashboardGuide'

type MetricTone = 'primary' | 'neutral' | 'success' | 'warning'

const TONE_ICON: Record<MetricTone, string> = {
  primary: 'bg-primary/10 text-primary',
  neutral: 'bg-slate-100 text-slate-600',
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
}

interface MetricCardProps {
  label: string
  value: string
  helper: string
  icon: ComponentType<{ className?: string }>
  tone?: MetricTone
}

function MetricCard({ label, value, helper, icon: Icon, tone = 'neutral' }: MetricCardProps) {
  return (
    <Card className="p-4 transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        <span
          className={cn(
            'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            TONE_ICON[tone],
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
    </Card>
  )
}

interface QuickLinkProps {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
}

function QuickLink({ to, label, icon: Icon }: QuickLinkProps) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  )
}

export function DashboardPage() {
  const { data, isLoading } = useDashboardMetrics()
  const {
    role,
    canManagePatients,
    canManageDoctors,
    canManageInvoices,
    canManageInsurance,
    canManageCatalog,
    canRegisterPayments,
  } = useRolePermissions()

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Dashboard" subtitle="Panorama operativo diario de facturación médica" />

      <div className="flex-1 px-6 py-5 overflow-auto space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Pacientes"
            value={isLoading ? '...' : String(data?.totalPatients ?? 0)}
            helper="Total registrados"
            icon={Users}
            tone="primary"
          />
          <MetricCard
            label="Medicos activos"
            value={isLoading ? '...' : String(data?.activeDoctors ?? 0)}
            helper="Disponibles en agenda"
            icon={Stethoscope}
            tone="neutral"
          />
          <MetricCard
            label="Citas hoy"
            value={isLoading ? '...' : String(data?.appointmentsToday ?? 0)}
            helper="Programadas para hoy"
            icon={CalendarDays}
            tone="neutral"
          />
          <MetricCard
            label="Proximas citas"
            value={isLoading ? '...' : String(data?.upcomingAppointments ?? 0)}
            helper="Pendientes por atender"
            icon={Activity}
            tone="neutral"
          />
          <MetricCard
            label="Facturas pendientes"
            value={isLoading ? '...' : String(data?.pendingInvoices ?? 0)}
            helper="Pendiente o pago parcial"
            icon={CreditCard}
            tone="warning"
          />
          <MetricCard
            label="Facturas vencidas"
            value={isLoading ? '...' : String(data?.overdueInvoices ?? 0)}
            helper="Requieren seguimiento"
            icon={FileWarning}
            tone="warning"
          />
          <MetricCard
            label="Cobrado"
            value={isLoading ? '...' : formatCurrency(data?.totalCollected ?? 0)}
            helper="Acumulado de pagos"
            icon={CreditCard}
            tone="success"
          />
          <MetricCard
            label="Por cobrar"
            value={isLoading ? '...' : formatCurrency(data?.pendingCollection ?? 0)}
            helper="Saldo pendiente total"
            icon={FileWarning}
            tone="warning"
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Accesos rápidos</h2>
          <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
            {canManagePatients && (
              <QuickLink to="/patients" label="Gestionar pacientes" icon={Users} />
            )}
            {canManageDoctors && (
              <QuickLink to="/doctors" label="Gestionar médicos" icon={Stethoscope} />
            )}
            <QuickLink to="/appointments" label="Ver agenda de citas" icon={CalendarDays} />
            {(canManageInvoices || canRegisterPayments) && (
              <QuickLink to="/invoices" label="Revisar facturas" icon={CreditCard} />
            )}
            {canManageInsurance && (
              <QuickLink to="/insurance" label="Administrar seguros" icon={Shield} />
            )}
            {canManageCatalog && (
              <QuickLink to="/catalog" label="Abrir catálogo clínico" icon={ClipboardList} />
            )}
          </div>
        </section>

        <DashboardGuide role={role} />
      </div>
    </div>
  )
}
