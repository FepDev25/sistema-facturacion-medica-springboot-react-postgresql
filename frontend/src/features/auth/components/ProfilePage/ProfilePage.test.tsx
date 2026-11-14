import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { m } = vi.hoisted(() => ({
  m: {
    profile: null as Record<string, unknown> | null,
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
}))

vi.mock('../../hooks/useProfile', () => ({
  useProfile: () => ({
    data: m.profile,
    isLoading: m.isLoading,
    error: m.error,
    refetch: m.refetch,
  }),
}))

import { ProfilePage } from '@/features/auth/components/ProfilePage'

const profile = {
  id: 'user-1',
  username: 'admin',
  email: 'admin@sfm.local',
  role: 'ADMIN',
  active: true,
  doctorId: null as string | null,
  doctorFirstName: null as string | null,
  doctorLastName: null as string | null,
}

function reset() {
  m.profile = { ...profile }
  m.isLoading = false
  m.error = null
  m.refetch = vi.fn()
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reset()
  })
  afterEach(cleanup)

  it('muestra el skeleton mientras carga', () => {
    m.isLoading = true
    render(<ProfilePage />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Cargando perfil')
  })

  it('muestra error y permite reintentar', async () => {
    const user = userEvent.setup()
    m.error = new Error('boom')
    render(<ProfilePage />)

    expect(screen.getByText('No se pudo cargar el perfil del usuario.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(m.refetch).toHaveBeenCalledTimes(1)
  })

  it('muestra el estado vacío sin reintento cuando no hay perfil', () => {
    m.profile = null
    render(<ProfilePage />)

    expect(screen.getByText('No se pudo cargar el perfil del usuario.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })

  it('renderiza los datos del usuario y su rol', () => {
    render(<ProfilePage />)

    expect(screen.getByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument()
    expect(screen.getByText('admin')).toBeInTheDocument()
    expect(screen.getByText('admin@sfm.local')).toBeInTheDocument()
    expect(screen.getByText('Administrador')).toBeInTheDocument()
    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.queryByText('Perfil de médico vinculado')).not.toBeInTheDocument()
  })

  it('muestra el perfil de médico vinculado y el estado inactivo', () => {
    m.profile = {
      ...profile,
      role: 'DOCTOR',
      active: false,
      doctorId: 'doc-1',
      doctorFirstName: 'Carlos',
      doctorLastName: 'Ruiz',
    }
    render(<ProfilePage />)

    expect(screen.getByText('Doctor')).toBeInTheDocument()
    expect(screen.getByText('Inactivo')).toBeInTheDocument()
    expect(screen.getByText('Perfil de médico vinculado')).toBeInTheDocument()
    expect(screen.getByText('Dr. Carlos Ruiz')).toBeInTheDocument()
  })
})
