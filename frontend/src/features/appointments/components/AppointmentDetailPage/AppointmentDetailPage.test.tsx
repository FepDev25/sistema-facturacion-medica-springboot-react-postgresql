import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

const { m, mockConfirmMutate, mockStartMutate, mockCancelMutate, mockNoShowMutate } = vi.hoisted(() => ({
  m: {
    appointmentData: null as unknown,
    medicalRecordData: null as unknown,
    patientData: { allergies: null, firstName: 'Ana', lastName: 'García' } as Record<string, unknown> | null,
    permissions: { role: 'ADMIN', canManagePatients: true, canCompleteAppointment: true },
    loggedInDoctorId: null as string | null,
  },
  mockConfirmMutate: vi.fn(),
  mockStartMutate: vi.fn(),
  mockCancelMutate: vi.fn(),
  mockNoShowMutate: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ id: 'apt-1' }),
  Link: ({ to, children, params: _p, ...rest }: { to: string; children: React.ReactNode; params?: Record<string, string>; className?: string; [key: string]: unknown }) => (
    <a href={to.replace('$id', _p?.id ?? '').replace('$invoiceId', _p?.invoiceId ?? '')} {...rest}>{children}</a>
  ),
}))

vi.mock('@/features/appointments/hooks/useAppointments', () => ({
  appointmentKeys: { all: ['appointments'] },
  useAppointment: () => ({ data: m.appointmentData, isLoading: false }),
  useAppointmentMedicalRecord: () => ({ data: m.medicalRecordData }),
  useConfirmAppointment: () => ({ mutate: mockConfirmMutate }),
  useStartAppointment: () => ({ mutate: mockStartMutate }),
  useCancelAppointment: () => ({ mutate: mockCancelMutate }),
  useNoShowAppointment: () => ({ mutate: mockNoShowMutate }),
  useAppointments: () => ({ data: null }),
  useCompleteAppointment: () => ({ mutate: vi.fn() }),
}))

vi.mock('@/features/auth/hooks/useRolePermissions', () => ({
  useRolePermissions: () => m.permissions,
  NO_PERMISSION_MESSAGE: 'No tienes permisos.',
}))

vi.mock('@/features/auth/hooks/useLoggedInDoctorId', () => ({
  useLoggedInDoctorId: () => m.loggedInDoctorId,
}))

vi.mock('@/features/patients/hooks/usePatients', () => ({
  usePatient: () => ({ data: m.patientData }),
  usePatientsPage: () => ({ data: null }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/features/appointments/components/AppointmentStatusFlow', () => ({
  AppointmentStatusFlow: ({ status, canOperate, canComplete }: { status: string; canOperate: boolean; canComplete: boolean }) => (
    <div data-testid="status-flow" data-status={status} data-can-operate={String(canOperate)} data-can-complete={String(canComplete)}>
      StatusFlow: {status}
    </div>
  ),
}))

vi.mock('@/features/appointments/components/CompleteAppointmentDrawer', () => ({
  CompleteAppointmentDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="complete-drawer">CompleteDrawer</div> : null,
}))

vi.mock('@/components/AllergyAlert', () => ({
  AllergyAlert: () => <div data-testid="allergy-alert" />,
}))

vi.mock('@/components/BackToListButton', () => ({
  BackToListButton: ({ label }: { label: string }) => <button>{label}</button>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className} data-testid="badge">{children}</span>
  ),
}))

import { AppointmentDetailPage } from '@/features/appointments/components/AppointmentDetailPage'

const baseAppointment = {
  id: 'apt-1',
  scheduledAt: '2025-06-15T10:00:00',
  scheduledEndAt: '2025-06-15T11:00:00',
  status: 'scheduled' as const,
  durationMinutes: 60,
  patientId: 'pat-1',
  patientFirstName: 'Ana',
  patientLastName: 'García',
  doctorId: 'doc-1',
  doctorFirstName: 'Carlos',
  doctorLastName: 'López',
  chiefComplaint: 'Dolor de cabeza',
  notes: 'Paciente refiere dolor desde hace 3 días',
  medicalRecordId: null,
  invoiceId: null,
  invoiceNumber: null,
}

function reset() {
  m.appointmentData = { ...baseAppointment }
  m.medicalRecordData = null
  m.patientData = { allergies: null, firstName: 'Ana', lastName: 'García' }
  m.permissions = { role: 'ADMIN', canManagePatients: true, canCompleteAppointment: true }
  m.loggedInDoctorId = null
}

describe('AppointmentDetailPage', () => {
  beforeEach(() => { vi.clearAllMocks(); reset() })
  afterEach(cleanup)

  it('shows not found state when appointment is null', () => {
    m.appointmentData = null
    render(<AppointmentDetailPage />)
    expect(screen.getByText('No se encontró la cita.')).toBeInTheDocument()
    expect(screen.getByText('Volver a citas')).toBeInTheDocument()
  })

  it('renders appointment summary sections', () => {
    render(<AppointmentDetailPage />)
    expect(screen.getByText('Resumen de atención')).toBeInTheDocument()
    expect(screen.getByText('Paciente')).toBeInTheDocument()
    expect(screen.getByText('Médico')).toBeInTheDocument()
    expect(screen.getByText('Notas clínicas')).toBeInTheDocument()
    expect(screen.getByText('60 minutos')).toBeInTheDocument()
  })

  it('renders patient and doctor names', () => {
    render(<AppointmentDetailPage />)
    expect(screen.getByText('Ana García')).toBeInTheDocument()
    expect(screen.getByText('Dr. Carlos López')).toBeInTheDocument()
  })

  it('renders AllergyAlert', () => {
    render(<AppointmentDetailPage />)
    expect(screen.getByTestId('allergy-alert')).toBeInTheDocument()
  })

  describe('isOwnAppointment logic', () => {
    it('DOCTOR viewing own appointment: canOperate=true', () => {
      m.permissions = { role: 'DOCTOR', canManagePatients: true, canCompleteAppointment: true }
      m.loggedInDoctorId = 'doc-1'
      render(<AppointmentDetailPage />)
      expect(screen.getByTestId('status-flow')).toHaveAttribute('data-can-operate', 'true')
    })

    it('DOCTOR viewing other doctor: canOperate=false, shows readonly warning', () => {
      m.permissions = { role: 'DOCTOR', canManagePatients: false, canCompleteAppointment: true }
      m.loggedInDoctorId = 'doc-other'
      render(<AppointmentDetailPage />)
      expect(screen.getByTestId('status-flow')).toHaveAttribute('data-can-operate', 'false')
      expect(screen.getByText('Solo lectura')).toBeInTheDocument()
      expect(screen.getByText('Esta cita pertenece a otro médico. No puedes modificarla.')).toBeInTheDocument()
    })

    it('ADMIN always has canOperate=true', () => {
      m.permissions = { role: 'ADMIN', canManagePatients: true, canCompleteAppointment: false }
      render(<AppointmentDetailPage />)
      expect(screen.getByTestId('status-flow')).toHaveAttribute('data-can-operate', 'true')
    })

    it('RECEPTIONIST always has canOperate=true', () => {
      m.permissions = { role: 'RECEPTIONIST', canManagePatients: true, canCompleteAppointment: false }
      render(<AppointmentDetailPage />)
      expect(screen.getByTestId('status-flow')).toHaveAttribute('data-can-operate', 'true')
    })
  })

  describe('CompleteDrawer and canComplete', () => {
    it('shows Completar cita when in_progress + canComplete=true', () => {
      m.appointmentData = { ...baseAppointment, status: 'in_progress' }
      m.permissions = { role: 'DOCTOR', canManagePatients: false, canCompleteAppointment: true }
      m.loggedInDoctorId = 'doc-1'
      render(<AppointmentDetailPage />)
      expect(screen.getByText('Completar cita')).toBeInTheDocument()
      expect(screen.getByTestId('status-flow')).toHaveAttribute('data-can-complete', 'true')
    })

    it('hides Completar cita when status is scheduled', () => {
      m.permissions = { role: 'DOCTOR', canManagePatients: false, canCompleteAppointment: true }
      m.loggedInDoctorId = 'doc-1'
      render(<AppointmentDetailPage />)
      expect(screen.queryByText('Completar cita')).not.toBeInTheDocument()
    })

    it('hides Completar cita when canComplete=false', () => {
      m.appointmentData = { ...baseAppointment, status: 'in_progress' }
      m.permissions = { role: 'RECEPTIONIST', canManagePatients: true, canCompleteAppointment: false }
      render(<AppointmentDetailPage />)
      expect(screen.queryByText('Completar cita')).not.toBeInTheDocument()
    })
  })

  describe('conditional sections', () => {
    it('shows medical record link when data exists', () => {
      m.medicalRecordData = { id: 'mr-1', recordDate: '2025-06-15T11:00:00' }
      render(<AppointmentDetailPage />)
      expect(screen.getByText('Expediente generado')).toBeInTheDocument()
      expect(screen.getByText('Ver expediente')).toBeInTheDocument()
    })

    it('hides medical record link when data is null', () => {
      render(<AppointmentDetailPage />)
      expect(screen.queryByText('Expediente generado')).not.toBeInTheDocument()
    })

    it('shows invoice link when invoice exists', () => {
      m.appointmentData = { ...baseAppointment, invoiceId: 'inv-1', invoiceNumber: 'FAC-001' }
      render(<AppointmentDetailPage />)
      expect(screen.getByText('Factura generada')).toBeInTheDocument()
      expect(screen.getByText('FAC-001')).toBeInTheDocument()
    })

    it('hides invoice link when invoice is null', () => {
      render(<AppointmentDetailPage />)
      expect(screen.queryByText('Factura generada')).not.toBeInTheDocument()
    })

    it('shows fallback text when notes are null', () => {
      m.appointmentData = { ...baseAppointment, chiefComplaint: null, notes: null }
      render(<AppointmentDetailPage />)
      expect(screen.getByText('Sin motivo registrado.')).toBeInTheDocument()
      expect(screen.getByText('Sin notas adicionales.')).toBeInTheDocument()
    })
  })
})
