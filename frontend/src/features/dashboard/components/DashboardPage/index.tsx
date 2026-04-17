import type { ComponentType } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Activity,
  CalendarDays,
  CreditCard,
  FileWarning,
  Stethoscope,
  Users,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useRolePermissions } from '@/features/auth/hooks/useRolePermissions'
import { useDashboardMetrics } from '../../hooks/useDashboard'

interface MetricCardProps {
  label: string
  value: string
  helper: string
  icon: ComponentType<{ className?: string }>
}

function MetricCard({ label, value, helper, icon: Icon }: MetricCardProps) {
  return (
    <div className="rounded-md border border-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{helper}</p>
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { data, isLoading } = useDashboardMetrics()
  const { canManagePatients, canManageDoctors, canManageInvoices, canManageInsurance, canManageCatalog, canRegisterPayments } = useRolePermissions()

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Panorama operativo diario de facturación médica
        </p>
      </div>

      <div className="flex-1 px-6 py-5 overflow-auto space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Pacientes"
            value={isLoading ? '...' : String(data?.totalPatients ?? 0)}
            helper="Total registrados"
            icon={Users}
          />
          <MetricCard
            label="Medicos activos"
            value={isLoading ? '...' : String(data?.activeDoctors ?? 0)}
            helper="Disponibles en agenda"
            icon={Stethoscope}
          />
          <MetricCard
            label="Citas hoy"
            value={isLoading ? '...' : String(data?.appointmentsToday ?? 0)}
            helper="Programadas para hoy"
            icon={CalendarDays}
          />
          <MetricCard
            label="Proximas citas"
            value={isLoading ? '...' : String(data?.upcomingAppointments ?? 0)}
            helper="Pendientes por atender"
            icon={Activity}
          />
          <MetricCard
            label="Facturas pendientes"
            value={isLoading ? '...' : String(data?.pendingInvoices ?? 0)}
            helper="Pendiente o pago parcial"
            icon={CreditCard}
          />
          <MetricCard
            label="Facturas vencidas"
            value={isLoading ? '...' : String(data?.overdueInvoices ?? 0)}
            helper="Requieren seguimiento"
            icon={FileWarning}
          />
          <MetricCard
            label="Cobrado"
            value={isLoading ? '...' : formatCurrency(data?.totalCollected ?? 0)}
            helper="Acumulado de pagos"
            icon={CreditCard}
          />
          <MetricCard
            label="Por cobrar"
            value={isLoading ? '...' : formatCurrency(data?.pendingCollection ?? 0)}
            helper="Saldo pendiente total"
            icon={FileWarning}
          />
        </section>

        <section className="rounded-md border border-border bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Accesos rápidos</h2>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {canManagePatients && (
              <Link to="/patients" className="text-sm text-primary underline-offset-4 hover:underline">
                Gestionar pacientes
              </Link>
            )}
            {canManageDoctors && (
              <Link to="/doctors" className="text-sm text-primary underline-offset-4 hover:underline">
                Gestionar médicos
              </Link>
            )}
            <Link to="/appointments" className="text-sm text-primary underline-offset-4 hover:underline">
              Ver agenda de citas
            </Link>
            {(canManageInvoices || canRegisterPayments) && (
              <Link to="/invoices" className="text-sm text-primary underline-offset-4 hover:underline">
                Revisar facturas
              </Link>
            )}
            {canManageInsurance && (
              <Link to="/insurance" className="text-sm text-primary underline-offset-4 hover:underline">
                Administrar seguros
              </Link>
            )}
            {canManageCatalog && (
              <Link to="/catalog" className="text-sm text-primary underline-offset-4 hover:underline">
                Abrir catálogo clínico
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
