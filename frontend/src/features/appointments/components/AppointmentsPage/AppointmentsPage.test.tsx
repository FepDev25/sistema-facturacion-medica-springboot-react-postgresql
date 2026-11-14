import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { m, mockUseAppointments, mockConfirm, mockStart, mockCancel, mockNoShow, mockToastError } =
  vi.hoisted(() => ({
    mockUseAppointments: vi.fn(),
    mockConfirm: vi.fn(),
    mockStart: vi.fn(),
    mockCancel: vi.fn(),
    mockNoShow: vi.fn(),
    mockToastError: vi.fn(),
    m: {
      role: 'ADMIN',
      canManagePatients: true,
      loggedInDoctorId: null as string | null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      page: {
        content: [] as Array<Record<string, unknown>>,
        totalElements: 0,
        totalPages: 1,
        number: 0,
        size: 20,
        first: true,
        last: true,
        empty: true,
      },
    },
  }))

vi.mock('../../hooks/useAppointments', () => ({
  useAppointments: (params: unknown) => {
    mockUseAppointments(params)
    return {
      data: m.page,
      isLoading: m.isLoading,
      isError: m.isError,
      refetch: m.refetch,
    }
  },
  useConfirmAppointment: () => ({ mutate: mockConfirm }),
  useStartAppointment: () => ({ mutate: mockStart }),
  useCancelAppointment: () => ({ mutate: mockCancel }),
  useNoShowAppointment: () => ({ mutate: mockNoShow }),
}))

vi.mock('@/features/auth/hooks/useRolePermissions', () => ({
  useRolePermissions: () => ({ role: m.role, canManagePatients: m.canManagePatients }),
  NO_PERMISSION_MESSAGE: 'No tienes permisos.',
}))

vi.mock('@/features/auth/hooks/useLoggedInDoctorId', () => ({
  useLoggedInDoctorId: () => m.loggedInDoctorId,
}))

vi.mock('@/features/appointments/components/AppointmentDrawer', () => ({
  AppointmentDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="appointment-drawer" /> : null,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string
    onValueChange?: (value: string) => void
    children?: React.ReactNode
  }) => (
    <select
      aria-label="Estado"
      value={value}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
  SelectValue: () => null,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

vi.mock('sonner', () => ({ toast: { error: mockToastError, success: vi.fn() } }))

import { AppointmentsPage } from '@/features/appointments/components/AppointmentsPage'

const appointment = {
  id: 'apt-1',
  patientFirstName: 'Ana',
  patientLastName: 'García',
  doctorFirstName: 'Carlos',
  doctorLastName: 'Ruiz',
  scheduledAt: '2026-11-20T10:00:00Z',
  status: 'scheduled',
}

function reset() {
  m.role = 'ADMIN'
  m.canManagePatients = true
  m.loggedInDoctorId = null
  m.isLoading = false
  m.isError = false
  m.refetch = vi.fn()
  m.page = {
    content: [],
    totalElements: 0,
    totalPages: 1,
    number: 0,
    size: 20,
    first: true,
    last: true,
    empty: true,
  }
}

describe('AppointmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reset()
  })
  afterEach(cleanup)

  it('solicita todas las citas y renderiza filas', () => {
    m.page = { ...m.page, content: [appointment], totalElements: 1, empty: false }
    render(<AppointmentsPage />)

    expect(screen.getByRole('heading', { name: 'Citas' })).toBeInTheDocument()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
    expect(screen.getByText('Dr. Carlos Ruiz')).toBeInTheDocument()
    expect(mockUseAppointments).toHaveBeenCalledWith({
      status: undefined,
      doctorId: undefined,
      page: 0,
      size: 20,
    })
  })

  it('filtra por estado y reinicia la página', async () => {
    const user = userEvent.setup()
    render(<AppointmentsPage />)

    await user.selectOptions(screen.getByLabelText('Estado'), 'confirmed')

    expect(mockUseAppointments).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'confirmed', page: 0 }),
    )
  })

  it('muestra vacío, error y reintento', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<AppointmentsPage />)
    expect(screen.getByText('No hay citas para el filtro seleccionado.')).toBeInTheDocument()

    m.isError = true
    rerender(<AppointmentsPage />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(m.refetch).toHaveBeenCalled()
  })

  it('en vista de doctor filtra por su id y bloquea la creación', () => {
    m.role = 'DOCTOR'
    m.loggedInDoctorId = 'doc-1'
    render(<AppointmentsPage />)

    expect(mockUseAppointments).toHaveBeenCalledWith(expect.objectContaining({ doctorId: 'doc-1' }))
    expect(screen.getByRole('button', { name: /Nueva cita/ })).toBeDisabled()
  })

  it('abre el drawer de nueva cita para ADMIN', async () => {
    const user = userEvent.setup()
    render(<AppointmentsPage />)

    await user.click(screen.getByRole('button', { name: /Nueva cita/ }))
    expect(screen.getByTestId('appointment-drawer')).toBeInTheDocument()
  })

  it('ejecuta la transición de estado desde la fila', async () => {
    const user = userEvent.setup()
    m.page = { ...m.page, content: [appointment], totalElements: 1, empty: false }
    render(<AppointmentsPage />)

    await user.click(screen.getByRole('button', { name: 'Confirmar cita' }))
    expect(mockConfirm).toHaveBeenCalledWith('apt-1')
  })

  it('pagina los resultados', async () => {
    const user = userEvent.setup()
    m.page = {
      ...m.page,
      totalElements: 25,
      totalPages: 2,
      number: 0,
      first: false,
      last: false,
      empty: false,
    }
    render(<AppointmentsPage />)

    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(mockUseAppointments).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }))
  })
})
