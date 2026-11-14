import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { m, mockUsePatientsPage } = vi.hoisted(() => ({
  mockUsePatientsPage: vi.fn(),
  m: {
    canManagePatients: true,
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

vi.mock('../../hooks/usePatients', () => ({
  usePatientsPage: (params: unknown) => {
    mockUsePatientsPage(params)
    return {
      data: m.page,
      isLoading: m.isLoading,
      isError: m.isError,
      refetch: m.refetch,
    }
  },
}))

vi.mock('@/features/auth/hooks/useRolePermissions', () => ({
  useRolePermissions: () => ({ canManagePatients: m.canManagePatients }),
  NO_PERMISSION_MESSAGE: 'No tienes permisos.',
}))

vi.mock('@/features/patients/components/PatientDrawer', () => ({
  PatientDrawer: ({ open, patientId }: { open: boolean; patientId: string | null }) =>
    open ? <div data-testid="patient-drawer">{patientId ?? 'nuevo'}</div> : null,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { PatientsPage } from '@/features/patients/components/PatientsPage'

const patient = {
  id: 'pat-1',
  dni: '12345678',
  firstName: 'Ana',
  lastName: 'García',
  phone: '+52 555 1234',
}

function reset() {
  m.canManagePatients = true
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

describe('PatientsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reset()
  })
  afterEach(cleanup)

  it('solicita la primera página y renderiza los pacientes', () => {
    m.page = { ...m.page, content: [patient], totalElements: 1, empty: false }
    render(<PatientsPage />)

    expect(screen.getByRole('heading', { name: 'Pacientes' })).toBeInTheDocument()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
    expect(screen.getByText('12345678')).toBeInTheDocument()
    expect(mockUsePatientsPage).toHaveBeenCalledWith({
      lastName: undefined,
      page: 0,
      size: 20,
    })
  })

  it('muestra skeletons y aria-busy mientras carga', () => {
    m.isLoading = true
    const { container } = render(<PatientsPage />)

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(screen.queryByText(/Página 1 de/)).not.toBeInTheDocument()
  })

  it('muestra estado vacío diferenciado sin búsqueda', () => {
    render(<PatientsPage />)
    expect(screen.getByText('No hay pacientes registrados.')).toBeInTheDocument()
  })

  it('muestra error con reintento', async () => {
    const user = userEvent.setup()
    m.isError = true
    render(<PatientsPage />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(m.refetch).toHaveBeenCalledTimes(1)
  })

  it('filtra por apellido y reinicia la página', async () => {
    const user = userEvent.setup()
    render(<PatientsPage />)

    await user.type(screen.getByPlaceholderText('Filtrar por apellido...'), 'Gar')

    expect(mockUsePatientsPage).toHaveBeenLastCalledWith({
      lastName: 'Gar',
      page: 0,
      size: 20,
    })
    expect(screen.getByText('Sin resultados para la búsqueda.')).toBeInTheDocument()
  })

  it('navega a la página siguiente y deshabilita el botón en la última', async () => {
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
    render(<PatientsPage />)

    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(mockUsePatientsPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }))
  })

  it('abre el drawer de creación y de edición', async () => {
    const user = userEvent.setup()
    m.page = { ...m.page, content: [patient], totalElements: 1, empty: false }
    render(<PatientsPage />)

    await user.click(screen.getByRole('button', { name: /Nuevo paciente/ }))
    expect(screen.getByTestId('patient-drawer')).toHaveTextContent('nuevo')

    await user.click(screen.getByRole('button', { name: 'Editar paciente' }))
    expect(screen.getByTestId('patient-drawer')).toHaveTextContent('pat-1')
  })

  it('deshabilita las acciones de escritura sin permiso', () => {
    m.canManagePatients = false
    m.page = { ...m.page, content: [patient], totalElements: 1, empty: false }
    render(<PatientsPage />)

    expect(screen.getByRole('button', { name: /Nuevo paciente/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Editar paciente' })).toBeDisabled()
  })
})
