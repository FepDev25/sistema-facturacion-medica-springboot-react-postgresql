import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { m, mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  m: {
    patients: [{ id: 'p-1', dni: '12345678', firstName: 'Ana', lastName: 'López', phone: '555' }],
  },
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('@/features/auth/hooks/useRolePermissions', () => ({
  useRolePermissions: () => ({ role: 'ADMIN', canManagePatients: true }),
}))

vi.mock('@/features/patients/hooks/usePatients', () => ({
  useSearchPatients: () => ({ data: m.patients, isFetching: false }),
}))

import { CommandPalette } from '@/components/CommandPalette'

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(cleanup)

describe('CommandPalette', () => {
  it('filtra la navegación por texto', async () => {
    const user = userEvent.setup()
    render(<CommandPalette open onOpenChange={vi.fn()} />)

    const input = screen.getByLabelText('Buscar pacientes o secciones')
    await user.type(input, 'fact')

    expect(screen.getByRole('option', { name: /Facturas/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Catálogo/ })).not.toBeInTheDocument()
  })

  it('navega a la sección seleccionada y cierra el palette', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<CommandPalette open onOpenChange={onOpenChange} />)

    await user.click(screen.getByRole('button', { name: /Pacientes/ }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/patients' })
  })

  it('busca pacientes y navega a su detalle', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<CommandPalette open onOpenChange={onOpenChange} />)

    await user.type(screen.getByLabelText('Buscar pacientes o secciones'), 'ana')
    await user.click(screen.getByRole('button', { name: /Ana López/ }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/patients/p-1' })
  })

  it('abre con Ctrl+K', async () => {
    const onOpenChange = vi.fn()
    render(<CommandPalette open={false} onOpenChange={onOpenChange} />)

    await userEvent.keyboard('{Control>}k{/Control}')

    expect(onOpenChange).toHaveBeenCalledWith(true)
  })
})
