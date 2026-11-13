import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { m, mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  m: {
    doctor: null as Record<string, unknown> | null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    appointments: [] as Array<Record<string, unknown>>,
  },
}))

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ id: 'doc-1' }),
  useNavigate: () => mockNavigate,
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

vi.mock('../../hooks/useDoctors', () => ({
  useDoctorById: () => ({
    data: m.doctor,
    isLoading: m.isLoading,
    isError: m.isError,
    refetch: m.refetch,
  }),
}))

vi.mock('@/features/appointments/hooks/useAppointments', () => ({
  useAppointments: () => ({ data: { content: m.appointments } }),
}))

import { DoctorDetailPage } from '@/features/doctors/components/DoctorDetailPage'

const doctor = {
  id: 'doc-1',
  licenseNumber: 'MED-001',
  firstName: 'Fernando',
  lastName: 'García',
  specialty: 'Medicina General',
  phone: '+52 555 1111',
  email: 'dr.garcia@example.com',
  isActive: true,
  userId: 'user-1',
  username: 'doctor1',
}

function reset() {
  m.doctor = { ...doctor }
  m.isLoading = false
  m.isError = false
  m.refetch = vi.fn()
  m.appointments = []
}

describe('DoctorDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reset()
  })
  afterEach(cleanup)

  it('muestra el skeleton mientras carga', () => {
    m.isLoading = true
    render(<DoctorDetailPage />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Cargando médico')
  })

  it('muestra error y reintenta', async () => {
    const user = userEvent.setup()
    m.isError = true
    render(<DoctorDetailPage />)

    expect(
      screen.getByText('No se pudo cargar el médico. Revisa tu conexión e intenta de nuevo.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(m.refetch).toHaveBeenCalledTimes(1)
  })

  it('muestra no encontrado cuando no hay datos', () => {
    m.doctor = null
    render(<DoctorDetailPage />)
    expect(screen.getByText('No se encontró el médico.')).toBeInTheDocument()
  })

  it('renderiza datos personales, estado y acceso al sistema', () => {
    render(<DoctorDetailPage />)

    expect(screen.getByRole('heading', { name: 'Dr. Fernando García' })).toBeInTheDocument()
    expect(screen.getByText('MED-001')).toBeInTheDocument()
    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.getByText('Vinculado')).toBeInTheDocument()
    expect(screen.getByText('doctor1')).toBeInTheDocument()
    expect(screen.getByText('Sin citas registradas para este médico.')).toBeInTheDocument()
  })

  it('renderiza médicos inactivos y sin acceso', () => {
    m.doctor = { ...doctor, isActive: false, userId: null, username: null }
    render(<DoctorDetailPage />)

    expect(screen.getByText('Inactivo')).toBeInTheDocument()
    expect(screen.getByText('Sin acceso')).toBeInTheDocument()
  })

  it('ordena y limita la agenda reciente a ocho citas', () => {
    m.appointments = Array.from({ length: 10 }, (_, index) => ({
      id: `apt-${index}`,
      patientFirstName: `Paciente${index}`,
      patientLastName: 'Prueba',
      scheduledAt: `2026-01-${String(20 - index).padStart(2, '0')}T10:00:00Z`,
    }))

    render(<DoctorDetailPage />)

    expect(screen.getByText(/Paciente9 Prueba/)).toBeInTheDocument()
    expect(screen.queryByText(/Paciente0 Prueba/)).not.toBeInTheDocument()
  })
})
