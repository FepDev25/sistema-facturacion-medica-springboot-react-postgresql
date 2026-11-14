import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const { m } = vi.hoisted(() => ({
  m: {
    isLoading: false,
    data: {
      totalPatients: 42,
      activeDoctors: 5,
      appointmentsToday: 3,
      upcomingAppointments: 7,
      pendingInvoices: 4,
      overdueInvoices: 2,
      totalCollected: 1500.5,
      pendingCollection: 800.25,
    } as Record<string, number>,
    permissions: {
      role: 'ADMIN',
      canManagePatients: true,
      canManageDoctors: true,
      canManageInvoices: true,
      canManageInsurance: true,
      canManageCatalog: true,
      canRegisterPayments: true,
    } as Record<string, unknown>,
  },
}))

vi.mock('@/features/dashboard/hooks/useDashboard', () => ({
  useDashboardMetrics: () => ({ data: m.data, isLoading: m.isLoading }),
}))

vi.mock('@/features/auth/hooks/useRolePermissions', () => ({
  useRolePermissions: () => m.permissions,
}))

vi.mock('@/features/dashboard/components/DashboardGuide', () => ({
  DashboardGuide: () => <div data-testid="dashboard-guide" />,
}))

vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>()
  return {
    ...actual,
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
  }
})

import { DashboardPage } from '@/features/dashboard/components/DashboardPage'

function reset() {
  m.isLoading = false
  m.data = {
    totalPatients: 42,
    activeDoctors: 5,
    appointmentsToday: 3,
    upcomingAppointments: 7,
    pendingInvoices: 4,
    overdueInvoices: 2,
    totalCollected: 1500.5,
    pendingCollection: 800.25,
  }
  m.permissions = {
    role: 'ADMIN',
    canManagePatients: true,
    canManageDoctors: true,
    canManageInvoices: true,
    canManageInsurance: true,
    canManageCatalog: true,
    canRegisterPayments: true,
  }
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reset()
  })
  afterEach(cleanup)

  it('renderiza las ocho métricas con sus valores', () => {
    render(<DashboardPage />)

    expect(screen.getByText('Pacientes')).toBeInTheDocument()
    expect(screen.getByText('Médicos activos')).toBeInTheDocument()
    expect(screen.getByText('Citas hoy')).toBeInTheDocument()
    expect(screen.getByText('Próximas citas')).toBeInTheDocument()
    expect(screen.getByText('Facturas pendientes')).toBeInTheDocument()
    expect(screen.getByText('Facturas vencidas')).toBeInTheDocument()
    expect(screen.getByText('Cobrado')).toBeInTheDocument()
    expect(screen.getByText('Por cobrar')).toBeInTheDocument()

    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('$1500.50')).toBeInTheDocument()
    expect(screen.getByText('$800.25')).toBeInTheDocument()
  })

  it('muestra placeholders mientras carga', () => {
    m.isLoading = true
    render(<DashboardPage />)

    expect(screen.getAllByText('...')).toHaveLength(8)
  })

  it('ADMIN ve todos los accesos rápidos', () => {
    render(<DashboardPage />)

    expect(screen.getByText('Gestionar pacientes')).toBeInTheDocument()
    expect(screen.getByText('Gestionar médicos')).toBeInTheDocument()
    expect(screen.getByText('Ver agenda de citas')).toBeInTheDocument()
    expect(screen.getByText('Revisar facturas')).toBeInTheDocument()
    expect(screen.getByText('Administrar seguros')).toBeInTheDocument()
    expect(screen.getByText('Abrir catálogo clínico')).toBeInTheDocument()
  })

  it('DOCTOR solo ve la agenda de citas', () => {
    m.permissions = {
      role: 'DOCTOR',
      canManagePatients: false,
      canManageDoctors: false,
      canManageInvoices: false,
      canManageInsurance: false,
      canManageCatalog: false,
      canRegisterPayments: false,
    }
    render(<DashboardPage />)

    expect(screen.getByText('Ver agenda de citas')).toBeInTheDocument()
    expect(screen.queryByText('Gestionar pacientes')).not.toBeInTheDocument()
    expect(screen.queryByText('Gestionar médicos')).not.toBeInTheDocument()
    expect(screen.queryByText('Revisar facturas')).not.toBeInTheDocument()
    expect(screen.queryByText('Administrar seguros')).not.toBeInTheDocument()
    expect(screen.queryByText('Abrir catálogo clínico')).not.toBeInTheDocument()
  })
})
