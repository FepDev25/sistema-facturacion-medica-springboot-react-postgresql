import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { m, mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  m: {
    patient: null as Record<string, unknown> | null,
    patientLoading: false,
    patientError: false,
    refetch: vi.fn(),
    appointments: [] as Array<Record<string, unknown>>,
    policies: [] as Array<Record<string, unknown>>,
    invoices: [] as Array<Record<string, unknown>>,
    records: [] as Array<Record<string, unknown>>,
  },
}))

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ id: 'pat-1' }),
  useNavigate: () => mockNavigate,
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('../../hooks/usePatients', () => ({
  usePatient: () => ({
    data: m.patient,
    isLoading: m.patientLoading,
    isError: m.patientError,
    refetch: m.refetch,
  }),
  usePatientAppointments: () => ({ data: m.appointments, isLoading: false }),
  usePatientPolicies: () => ({ data: m.policies, isLoading: false }),
  usePatientInvoices: () => ({ data: m.invoices, isLoading: false }),
}))

vi.mock('@/features/medical-records/hooks/useMedicalRecords', () => ({
  usePatientMedicalRecords: () => ({ data: m.records, isLoading: false }),
}))

vi.mock('@/features/ai/components/PatientHistoryChat', () => ({
  PatientHistoryChat: ({ patientId }: { patientId: string }) => (
    <div data-testid="patient-history-chat">Chat {patientId}</div>
  ),
}))

import { PatientDetailPage } from '@/features/patients/components/PatientDetailPage'

const patient = {
  id: 'pat-1',
  dni: '12345678',
  firstName: 'Ana',
  lastName: 'García',
  birthDate: '1985-03-15',
  gender: 'female',
  phone: '+52 555 1234',
  email: 'ana@example.com',
  address: 'Calle 1',
  bloodType: 'O+',
  allergies: 'Penicilina',
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-02T10:00:00Z',
}

function reset() {
  m.patient = { ...patient }
  m.patientLoading = false
  m.patientError = false
  m.refetch = vi.fn()
  m.appointments = []
  m.policies = []
  m.invoices = []
  m.records = []
}

describe('PatientDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reset()
  })
  afterEach(cleanup)

  it('muestra el skeleton mientras carga', () => {
    m.patientLoading = true
    render(<PatientDetailPage />)

    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Cargando paciente')
  })

  it('muestra error y reintenta', async () => {
    const user = userEvent.setup()
    m.patientError = true
    render(<PatientDetailPage />)

    expect(
      screen.getByText('No se pudo cargar el paciente. Revisa tu conexión e intenta de nuevo.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(m.refetch).toHaveBeenCalledTimes(1)
  })

  it('muestra no encontrado cuando no hay datos', () => {
    m.patient = null
    render(<PatientDetailPage />)

    expect(screen.getByText('No se encontró el paciente.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volver a pacientes' })).toBeInTheDocument()
  })

  it('renderiza la ficha, la alerta de alergias y el chat de IA', () => {
    render(<PatientDetailPage />)

    expect(screen.getByRole('heading', { name: 'Ana García' })).toBeInTheDocument()
    expect(screen.getByText('12345678')).toBeInTheDocument()
    expect(screen.getByText('Femenino')).toBeInTheDocument()
    expect(screen.getByText('O+')).toBeInTheDocument()
    expect(screen.getAllByText('Penicilina').length).toBeGreaterThan(0)
    expect(screen.getByText('AllergyAlert')).toBeInTheDocument()
    expect(screen.getByTestId('patient-history-chat')).toHaveTextContent('pat-1')
  })

  it('muestra los estados vacíos de las cuatro secciones', () => {
    render(<PatientDetailPage />)

    expect(screen.getByText('Sin citas registradas para este paciente.')).toBeInTheDocument()
    expect(screen.getByText('Sin pólizas registradas para este paciente.')).toBeInTheDocument()
    expect(screen.getByText('Sin facturas registradas para este paciente.')).toBeInTheDocument()
    expect(screen.getByText('Sin expedientes registrados para este paciente.')).toBeInTheDocument()
  })

  it('renderiza las filas de las secciones relacionadas', () => {
    m.appointments = [
      {
        id: 'apt-1',
        scheduledAt: '2026-01-10T10:00:00Z',
        status: 'completed',
        doctorFirstName: 'Carlos',
        doctorLastName: 'Ruiz',
      },
    ]
    m.policies = [
      {
        id: 'pol-1',
        policyNumber: 'POL-1',
        providerName: 'Seguros',
        coveragePercentage: 80,
        isActive: true,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
    ]
    m.invoices = [
      {
        id: 'inv-1',
        invoiceNumber: 'FAC-1',
        total: 100,
        patientResponsibility: 20,
        status: 'pending',
        issueDate: '2026-01-01',
        dueDate: '2026-12-31',
      },
    ]
    m.records = [{ id: 'mr-1', recordDate: '2026-01-10T10:00:00Z', clinicalNotes: 'Notas' }]

    render(<PatientDetailPage />)

    expect(screen.getByText('Dr. Carlos Ruiz')).toBeInTheDocument()
    expect(screen.getByText('POL-1')).toBeInTheDocument()
    expect(screen.getByText('FAC-1')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver detalle del expediente' })).toBeInTheDocument()
  })
})
