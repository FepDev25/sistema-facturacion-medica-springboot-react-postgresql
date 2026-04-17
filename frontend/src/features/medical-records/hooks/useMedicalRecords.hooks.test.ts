import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createAllProviders } from '@/test/test-utils'
import { toast } from 'sonner'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/medical-records/api/medicalRecordsApi', () => ({
  getMedicalRecordById: vi.fn(),
  getMedicalRecordByAppointment: vi.fn(),
  getMedicalRecordsByPatient: vi.fn(),
  getDiagnosesByMedicalRecord: vi.fn(),
  addDiagnosis: vi.fn(),
  getPrescriptionsByMedicalRecord: vi.fn(),
  addPrescription: vi.fn(),
  getProceduresByMedicalRecord: vi.fn(),
  addProcedure: vi.fn(),
}))

import * as mrApi from '@/features/medical-records/api/medicalRecordsApi'
import {
  useMedicalRecord,
  useMedicalRecordByAppointment,
  usePatientMedicalRecords,
  useMedicalRecordDiagnoses,
  useAddDiagnosis,
  useAddPrescription,
  useAddProcedure,
} from '@/features/medical-records/hooks/useMedicalRecords'
import { medicalRecordKeys } from '@/features/medical-records/hooks/useMedicalRecords'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('medicalRecordKeys', () => {
  it('creates correct detail key', () => {
    expect(medicalRecordKeys.detail('mr-1')).toEqual(['medical-records', 'detail', 'mr-1'])
  })

  it('creates correct byAppointment key', () => {
    expect(medicalRecordKeys.byAppointment('apt-1')).toEqual(['medical-records', 'appointment', 'apt-1'])
  })

  it('creates correct byPatient key', () => {
    expect(medicalRecordKeys.byPatient('p-1')).toEqual(['medical-records', 'patient', 'p-1'])
  })

  it('creates correct diagnoses key', () => {
    expect(medicalRecordKeys.diagnoses('mr-1')).toEqual(['medical-records', 'diagnoses', 'mr-1'])
  })

  it('creates correct prescriptions key', () => {
    expect(medicalRecordKeys.prescriptions('mr-1')).toEqual(['medical-records', 'prescriptions', 'mr-1'])
  })

  it('creates correct procedures key', () => {
    expect(medicalRecordKeys.procedures('mr-1')).toEqual(['medical-records', 'procedures', 'mr-1'])
  })
})

describe('useMedicalRecord', () => {
  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useMedicalRecord(''), { wrapper: createAllProviders() })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fetches medical record by id', async () => {
    vi.mocked(mrApi.getMedicalRecordById).mockResolvedValue({
      id: 'mr-1', appointmentId: 'apt-1', patientId: 'p-1',
      clinicalNotes: 'Notes', physicalExam: null, vitalSigns: null, recordDate: '2025-06-20T10:00:00Z',
      diagnoses: [], prescriptions: [], procedures: [],
    })
    const { result } = renderHook(() => useMedicalRecord('mr-1'), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mrApi.getMedicalRecordById).toHaveBeenCalledWith('mr-1')
  })
})

describe('useMedicalRecordByAppointment', () => {
  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useMedicalRecordByAppointment(''), { wrapper: createAllProviders() })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fetches record by appointment id', async () => {
    vi.mocked(mrApi.getMedicalRecordByAppointment).mockResolvedValue({
      id: 'mr-1', appointmentId: 'apt-1', patientId: 'p-1',
      clinicalNotes: 'Notes', physicalExam: null, vitalSigns: null, recordDate: '2025-06-20T10:00:00Z',
      diagnoses: [], prescriptions: [], procedures: [],
    })
    const { result } = renderHook(() => useMedicalRecordByAppointment('apt-1'), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mrApi.getMedicalRecordByAppointment).toHaveBeenCalledWith('apt-1')
  })
})

describe('usePatientMedicalRecords', () => {
  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => usePatientMedicalRecords(''), { wrapper: createAllProviders() })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fetches patient records and unwraps content', async () => {
    vi.mocked(mrApi.getMedicalRecordsByPatient).mockResolvedValue({
      content: [{ id: 'mr-1', appointmentId: 'apt-1', patientId: 'p-1', clinicalNotes: 'Notes', physicalExam: null, vitalSigns: null, recordDate: '2025-06-20T10:00:00Z', diagnoses: [], prescriptions: [], procedures: [] }],
      totalElements: 1, totalPages: 1, number: 0, size: 100, first: true, last: true, empty: false,
    })
    const { result } = renderHook(() => usePatientMedicalRecords('p-1'), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
  })
})

describe('useMedicalRecordDiagnoses', () => {
  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useMedicalRecordDiagnoses(''), { wrapper: createAllProviders() })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fetches diagnoses and unwraps content', async () => {
    vi.mocked(mrApi.getDiagnosesByMedicalRecord).mockResolvedValue({
      content: [{ id: 'd-1', medicalRecordId: 'mr-1', icd10Code: 'J06.9', description: 'Infeccion', severity: 'mild', diagnosedAt: '2025-06-20T10:00:00Z' }],
      totalElements: 1, totalPages: 1, number: 0, size: 100, first: true, last: true, empty: false,
    })
    const { result } = renderHook(() => useMedicalRecordDiagnoses('mr-1'), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
  })
})

describe('useAddDiagnosis', () => {
  it('calls addDiagnosis with record id and data and shows success toast', async () => {
    vi.mocked(mrApi.addDiagnosis).mockResolvedValue({ id: 'd-1' } as never)
    const { result } = renderHook(() => useAddDiagnosis('mr-1'), { wrapper: createAllProviders() })
    result.current.mutate({ appointmentId: 'apt-1', medicalRecordId: 'mr-1', icd10Code: 'J06.9', description: 'Infeccion', diagnosedAt: '2025-06-20T10:00:00Z' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mrApi.addDiagnosis).toHaveBeenCalledWith('mr-1', expect.objectContaining({ icd10Code: 'J06.9' }))
    expect(toast.success).toHaveBeenCalledWith('Diagnostico agregado')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(mrApi.addDiagnosis).mockRejectedValue(new Error('bad'))
    const { result } = renderHook(() => useAddDiagnosis('mr-1'), { wrapper: createAllProviders() })
    result.current.mutate({ appointmentId: 'apt-1', medicalRecordId: 'mr-1', icd10Code: 'J06.9', description: 'Infeccion', diagnosedAt: '2025-06-20T10:00:00Z' })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error al agregar diagnostico')
  })
})

describe('useAddPrescription', () => {
  it('calls addPrescription with record id and data and shows success toast', async () => {
    vi.mocked(mrApi.addPrescription).mockResolvedValue({ id: 'rx-1' } as never)
    const { result } = renderHook(() => useAddPrescription('mr-1'), { wrapper: createAllProviders() })
    result.current.mutate({ appointmentId: 'apt-1', medicalRecordId: 'mr-1', medicationId: 'med-1', dosage: '400mg', frequency: 'Cada 8h', durationDays: 7 })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mrApi.addPrescription).toHaveBeenCalledWith('mr-1', expect.objectContaining({ dosage: '400mg' }))
    expect(toast.success).toHaveBeenCalledWith('Prescripcion agregada')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(mrApi.addPrescription).mockRejectedValue(new Error('bad'))
    const { result } = renderHook(() => useAddPrescription('mr-1'), { wrapper: createAllProviders() })
    result.current.mutate({ appointmentId: 'apt-1', medicalRecordId: 'mr-1', medicationId: 'med-1', dosage: '400mg', frequency: 'Cada 8h', durationDays: 7 })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error al agregar prescripcion')
  })
})

describe('useAddProcedure', () => {
  it('calls addProcedure with record id and data and shows success toast', async () => {
    vi.mocked(mrApi.addProcedure).mockResolvedValue({ id: 'proc-1' } as never)
    const { result } = renderHook(() => useAddProcedure('mr-1'), { wrapper: createAllProviders() })
    result.current.mutate({ appointmentId: 'apt-1', medicalRecordId: 'mr-1', procedureCode: 'PROC-001', description: 'Extraccion', performedAt: '2025-06-20T10:00:00Z' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mrApi.addProcedure).toHaveBeenCalledWith('mr-1', expect.objectContaining({ procedureCode: 'PROC-001' }))
    expect(toast.success).toHaveBeenCalledWith('Procedimiento agregado')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(mrApi.addProcedure).mockRejectedValue(new Error('bad'))
    const { result } = renderHook(() => useAddProcedure('mr-1'), { wrapper: createAllProviders() })
    result.current.mutate({ appointmentId: 'apt-1', medicalRecordId: 'mr-1', procedureCode: 'PROC-001', description: 'Extraccion', performedAt: '2025-06-20T10:00:00Z' })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error al agregar procedimiento')
  })
})
