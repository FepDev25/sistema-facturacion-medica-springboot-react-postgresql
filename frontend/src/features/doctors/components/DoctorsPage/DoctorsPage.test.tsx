import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { m, mockUseDoctorsPage, mockDeactivate } = vi.hoisted(() => ({
  mockUseDoctorsPage: vi.fn(),
  mockDeactivate: vi.fn(),
  m: {
    canManageDoctors: true,
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

vi.mock('../../hooks/useDoctors', () => ({
  useDoctorsPage: (params: unknown) => {
    mockUseDoctorsPage(params)
    return {
      data: m.page,
      isLoading: m.isLoading,
      isError: m.isError,
      refetch: m.refetch,
    }
  },
  useDeactivateDoctor: () => ({ mutate: mockDeactivate }),
}))

vi.mock('@/features/auth/hooks/useRolePermissions', () => ({
  useRolePermissions: () => ({ canManageDoctors: m.canManageDoctors }),
  NO_PERMISSION_MESSAGE: 'No tienes permisos.',
}))

vi.mock('@/features/doctors/components/DoctorDrawer', () => ({
  DoctorDrawer: ({ open, doctorId }: { open: boolean; doctorId: string | null }) =>
    open ? <div data-testid="doctor-drawer">{doctorId ?? 'nuevo'}</div> : null,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { DoctorsPage } from '@/features/doctors/components/DoctorsPage'

const doctor = {
  id: 'doc-1',
  licenseNumber: 'MED-001',
  firstName: 'Fernando',
  lastName: 'García',
  specialty: 'Medicina General',
}

function reset() {
  m.canManageDoctors = true
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

describe('DoctorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reset()
  })
  afterEach(cleanup)

  it('solicita la primera página y renderiza médicos', () => {
    m.page = { ...m.page, content: [doctor], totalElements: 1, empty: false }
    render(<DoctorsPage />)

    expect(screen.getByRole('heading', { name: 'Médicos' })).toBeInTheDocument()
    expect(screen.getByText('Fernando García')).toBeInTheDocument()
    expect(screen.getByText('Medicina General')).toBeInTheDocument()
    expect(mockUseDoctorsPage).toHaveBeenCalledWith({
      specialty: undefined,
      includeInactive: false,
      page: 0,
      size: 20,
    })
  })

  it('muestra estado vacío y de error', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<DoctorsPage />)
    expect(screen.getByText('No hay médicos registrados.')).toBeInTheDocument()

    m.isError = true
    rerender(<DoctorsPage />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(m.refetch).toHaveBeenCalled()
  })

  it('filtra por especialidad y muestra inactivos', async () => {
    const user = userEvent.setup()
    render(<DoctorsPage />)

    await user.type(screen.getByPlaceholderText('Filtrar por especialidad...'), 'Cardio')
    expect(mockUseDoctorsPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ specialty: 'Cardio', page: 0 }),
    )

    await user.click(screen.getByLabelText('Mostrar inactivos'))
    expect(mockUseDoctorsPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ includeInactive: true, page: 0 }),
    )
  })

  it('pagina y muestra el total de médicos', async () => {
    const user = userEvent.setup()
    m.page = {
      ...m.page,
      totalElements: 21,
      totalPages: 2,
      number: 0,
      first: false,
      last: false,
      empty: false,
    }
    render(<DoctorsPage />)

    expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(mockUseDoctorsPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }))
  })

  it('abre el drawer de creación y edición', async () => {
    const user = userEvent.setup()
    m.page = { ...m.page, content: [doctor], totalElements: 1, empty: false }
    render(<DoctorsPage />)

    await user.click(screen.getByRole('button', { name: /Nuevo médico/ }))
    expect(screen.getByTestId('doctor-drawer')).toHaveTextContent('nuevo')

    await user.click(screen.getByRole('button', { name: 'Editar médico' }))
    expect(screen.getByTestId('doctor-drawer')).toHaveTextContent('doc-1')
  })

  it('desactiva un médico con permiso', async () => {
    const user = userEvent.setup()
    m.page = { ...m.page, content: [doctor], totalElements: 1, empty: false }
    render(<DoctorsPage />)

    await user.click(screen.getByRole('button', { name: 'Desactivar médico' }))
    expect(mockDeactivate).toHaveBeenCalledWith('doc-1')
  })

  it('deshabilita acciones sin permiso', () => {
    m.canManageDoctors = false
    m.page = { ...m.page, content: [doctor], totalElements: 1, empty: false }
    render(<DoctorsPage />)

    expect(screen.getByRole('button', { name: /Nuevo médico/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Editar médico' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Desactivar médico' })).toBeDisabled()
  })
})
