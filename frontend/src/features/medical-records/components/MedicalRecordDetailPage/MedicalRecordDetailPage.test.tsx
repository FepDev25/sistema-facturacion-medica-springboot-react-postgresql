import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { selectMocks } from '@/test/drawer-test-utils'

const { m, mockNavigate, mockAddDiagnosis, mockAddPrescription, mockAddProcedure, mockExtract } =
  vi.hoisted(() => ({
    mockNavigate: vi.fn(),
    mockAddDiagnosis: vi.fn(),
    mockAddPrescription: vi.fn(),
    mockAddProcedure: vi.fn(),
    mockExtract: vi.fn(),
    m: {
      record: null as Record<string, unknown> | null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      diagnoses: [] as Array<Record<string, unknown>>,
      prescriptions: [] as Array<Record<string, unknown>>,
      procedures: [] as Array<Record<string, unknown>>,
      allergies: null as string | null,
    },
  }))

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ id: 'mr-1' }),
  useNavigate: () => mockNavigate,
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

vi.mock('../../hooks/useMedicalRecords', () => ({
  useMedicalRecord: () => ({
    data: m.record,
    isLoading: m.isLoading,
    isError: m.isError,
    refetch: m.refetch,
  }),
  useMedicalRecordDiagnoses: () => ({ data: m.diagnoses, isLoading: false }),
  useMedicalRecordPrescriptions: () => ({ data: m.prescriptions, isLoading: false }),
  useMedicalRecordProcedures: () => ({ data: m.procedures, isLoading: false }),
  useAddDiagnosis: () => ({ mutate: mockAddDiagnosis, isPending: false }),
  useAddPrescription: () => ({ mutate: mockAddPrescription, isPending: false }),
  useAddProcedure: () => ({ mutate: mockAddProcedure, isPending: false }),
}))

vi.mock('@/features/catalog/hooks/useCatalog', () => ({
  useMedications: () => ({ data: [] }),
}))

vi.mock('@/features/patients/hooks/usePatients', () => ({
  usePatient: () => ({ data: { allergies: m.allergies } }),
}))

vi.mock('@/features/ai/hooks/useAi', () => ({
  useExtractRecord: () => ({ mutate: mockExtract, isPending: false, data: null }),
}))

vi.mock('@/features/ai/components/Icd10Suggester', () => ({
  Icd10Suggester: () => <div data-testid="icd10-suggester" />,
}))

vi.mock('@/features/ai/components/ExtractionPanel', () => ({
  ExtractionPanel: () => <div data-testid="extraction-panel" />,
}))

vi.mock('@/components/ui/select', () => selectMocks)

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <h3>{children}</h3>,
}))

import { MedicalRecordDetailPage } from '@/features/medical-records/components/MedicalRecordDetailPage'

const record = {
  id: 'mr-1',
  patientId: 'pat-1',
  patientFirstName: 'Ana',
  patientLastName: 'García',
  appointmentId: 'apt-1',
  clinicalNotes: 'Paciente con faringitis.',
  recordDate: '2026-01-15T09:30:00Z',
}

function reset() {
  m.record = { ...record }
  m.isLoading = false
  m.isError = false
  m.refetch = vi.fn()
  m.diagnoses = []
  m.prescriptions = []
  m.procedures = []
  m.allergies = null
}

describe('MedicalRecordDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reset()
  })
  afterEach(cleanup)

  it('muestra el skeleton mientras carga', () => {
    m.isLoading = true
    render(<MedicalRecordDetailPage />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Cargando expediente')
  })

  it('muestra error y reintento', async () => {
    const user = userEvent.setup()
    m.isError = true
    render(<MedicalRecordDetailPage />)

    expect(
      screen.getByText('No se pudo cargar el expediente. Revisa tu conexión e intenta de nuevo.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(m.refetch).toHaveBeenCalledTimes(1)
  })

  it('muestra no encontrado cuando no hay expediente', () => {
    m.record = null
    render(<MedicalRecordDetailPage />)
    expect(screen.getByText('No se encontró el expediente.')).toBeInTheDocument()
  })

  it('renderiza resumen y estados vacíos de las tres secciones', () => {
    m.allergies = 'Penicilina'
    render(<MedicalRecordDetailPage />)

    expect(screen.getByRole('heading', { name: 'Expediente clínico' })).toBeInTheDocument()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
    expect(screen.getByText('Paciente con faringitis.')).toBeInTheDocument()
    expect(screen.getByTestId('icd10-suggester')).toBeInTheDocument()
    expect(screen.getByText('Sin diagnósticos registrados.')).toBeInTheDocument()
    expect(screen.getByText('Sin prescripciones registradas.')).toBeInTheDocument()
    expect(screen.getByText('Sin procedimientos registrados.')).toBeInTheDocument()
    expect(screen.getByText('AllergyAlert')).toBeInTheDocument()
  })

  it('renderiza diagnósticos, prescripciones y procedimientos', () => {
    m.diagnoses = [
      {
        id: 'diag-1',
        icd10Code: 'J02.9',
        description: 'Faringitis aguda',
        severity: 'moderate',
        diagnosedAt: '2026-01-15T09:30:00Z',
      },
    ]
    m.prescriptions = [
      {
        id: 'pres-1',
        medicationName: 'Paracetamol',
        dosage: '500 mg',
        frequency: 'Cada 8 horas',
        durationDays: 5,
        createdAt: '2026-01-15T09:30:00Z',
      },
    ]
    m.procedures = [
      {
        id: 'proc-1',
        procedureCode: 'PROC-1',
        description: 'Curación',
        performedAt: '2026-01-15T09:30:00Z',
      },
    ]

    render(<MedicalRecordDetailPage />)

    expect(screen.getByText('Faringitis aguda')).toBeInTheDocument()
    expect(screen.getByText('Paracetamol')).toBeInTheDocument()
    expect(screen.getByText('Curación')).toBeInTheDocument()
  })

  it('lanza la extracción con IA usando las notas clínicas', async () => {
    const user = userEvent.setup()
    render(<MedicalRecordDetailPage />)

    await user.click(screen.getByRole('button', { name: /Extraer con IA/ }))
    expect(mockExtract).toHaveBeenCalledWith(
      {
        medicalRecordId: 'mr-1',
        appointmentId: 'apt-1',
        clinicalNotes: 'Paciente con faringitis.',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('deshabilita la extracción cuando no hay notas clínicas', () => {
    m.record = { ...record, clinicalNotes: '' }
    render(<MedicalRecordDetailPage />)
    expect(screen.getByRole('button', { name: /Extraer con IA/ })).toBeDisabled()
  })

  it('registra un diagnóstico desde el formulario', async () => {
    const user = userEvent.setup()
    render(<MedicalRecordDetailPage />)

    await user.type(screen.getByLabelText('Código ICD-10'), 'J02.9')
    await user.type(screen.getAllByLabelText('Descripción')[0], 'Faringitis aguda')
    await user.click(screen.getAllByRole('button', { name: 'Guardar' })[0])

    await waitFor(() => expect(mockAddDiagnosis).toHaveBeenCalled())
    expect(mockAddDiagnosis).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: 'apt-1',
        medicalRecordId: 'mr-1',
        icd10Code: 'J02.9',
      }),
      expect.any(Object),
    )
  })
})
