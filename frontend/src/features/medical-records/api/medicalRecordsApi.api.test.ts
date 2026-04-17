import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getMedicalRecordById,
  getMedicalRecordByAppointment,
  getMedicalRecordsByPatient,
  getDiagnosesByMedicalRecord,
  addDiagnosis,
  getPrescriptionsByMedicalRecord,
  addPrescription,
  getProceduresByMedicalRecord,
  addProcedure,
  toMedicalRecordCreateRequest,
  toDiagnosisCreateRequest,
  toPrescriptionCreateRequest,
  toProcedureCreateRequest,
} from '@/features/medical-records/api/medicalRecordsApi'
import type { CompleteAppointmentFormValues, DiagnosisFormValues, PrescriptionFormValues, ProcedureFormValues } from '@/features/medical-records/api/medicalRecordsApi'

vi.mock('@/lib/axios', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: { headers: { common: {} } },
  },
}))

import { apiClient as mockedClient } from '@/lib/axios'

const mockGet = vi.mocked(mockedClient.get)
const mockPost = vi.mocked(mockedClient.post)

beforeEach(() => {
  vi.clearAllMocks()
})

const mockRecord = {
  id: 'mr-1', appointmentId: 'apt-1', patientId: 'p-1',
  clinicalNotes: 'Paciente con dolor abdominal.', physicalExam: null, vitalSigns: null,
  recordDate: '2025-06-20T10:00:00Z',
  diagnoses: [], prescriptions: [], procedures: [],
}

describe('medical records API', () => {
  describe('getMedicalRecordById', () => {
    it('fetches record by id', async () => {
      mockGet.mockResolvedValue({ data: mockRecord })
      const result = await getMedicalRecordById('mr-1')
      expect(mockGet).toHaveBeenCalledWith('/medical-records/mr-1')
      expect(result.clinicalNotes).toBe('Paciente con dolor abdominal.')
    })
  })

  describe('getMedicalRecordByAppointment', () => {
    it('returns record when found', async () => {
      mockGet.mockResolvedValue({ data: mockRecord })
      const result = await getMedicalRecordByAppointment('apt-1')
      expect(mockGet).toHaveBeenCalledWith('/medical-records/appointment/apt-1')
      expect(result?.id).toBe('mr-1')
    })

    it('returns null on error', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))
      const result = await getMedicalRecordByAppointment('apt-999')
      expect(result).toBeNull()
    })
  })

  describe('getMedicalRecordsByPatient', () => {
    it('fetches paginated records for patient', async () => {
      mockGet.mockResolvedValue({ data: { content: [mockRecord], totalElements: 1, totalPages: 1, number: 0, size: 20, first: true, last: true, empty: false } })
      const result = await getMedicalRecordsByPatient('p-1')
      expect(mockGet).toHaveBeenCalledWith('/medical-records/patient/p-1', { params: { page: 0, size: 20 } })
      expect(result.content).toHaveLength(1)
    })
  })

  describe('diagnoses', () => {
    it('fetches paginated diagnoses', async () => {
      mockGet.mockResolvedValue({ data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20, first: true, last: true, empty: true } })
      await getDiagnosesByMedicalRecord('mr-1')
      expect(mockGet).toHaveBeenCalledWith('/medical-records/mr-1/diagnoses', { params: { page: 0, size: 20 } })
    })

    it('posts new diagnosis', async () => {
      const diag = { id: 'd-1', medicalRecordId: 'mr-1', icd10Code: 'J06.9', description: 'Infeccion respiratoria', severity: 'mild' as const, diagnosedAt: '2025-06-20T10:00:00Z' }
      mockPost.mockResolvedValue({ data: diag })
      const result = await addDiagnosis('mr-1', { appointmentId: 'apt-1', medicalRecordId: 'mr-1', icd10Code: 'J06.9', description: 'Infeccion', diagnosedAt: '2025-06-20T10:00:00Z' })
      expect(mockPost).toHaveBeenCalledWith('/medical-records/mr-1/diagnoses', expect.objectContaining({ icd10Code: 'J06.9' }))
      expect(result.id).toBe('d-1')
    })
  })

  describe('prescriptions', () => {
    it('fetches paginated prescriptions', async () => {
      mockGet.mockResolvedValue({ data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20, first: true, last: true, empty: true } })
      await getPrescriptionsByMedicalRecord('mr-1')
      expect(mockGet).toHaveBeenCalledWith('/medical-records/mr-1/prescriptions', { params: { page: 0, size: 20 } })
    })

    it('posts new prescription', async () => {
      const rx = { id: 'rx-1', medicalRecordId: 'mr-1', medicationId: 'med-1', medicationName: 'Ibuprofeno', dosage: '400mg', frequency: 'Cada 8h', durationDays: 7, instructions: null }
      mockPost.mockResolvedValue({ data: rx })
      await addPrescription('mr-1', { appointmentId: 'apt-1', medicalRecordId: 'mr-1', medicationId: 'med-1', dosage: '400mg', frequency: 'Cada 8h', durationDays: 7 })
      expect(mockPost).toHaveBeenCalledWith('/medical-records/mr-1/prescriptions', expect.objectContaining({ dosage: '400mg' }))
    })
  })

  describe('procedures', () => {
    it('fetches paginated procedures', async () => {
      mockGet.mockResolvedValue({ data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20, first: true, last: true, empty: true } })
      await getProceduresByMedicalRecord('mr-1')
      expect(mockGet).toHaveBeenCalledWith('/medical-records/mr-1/procedures', { params: { page: 0, size: 20 } })
    })

    it('posts new procedure', async () => {
      const proc = { id: 'proc-1', medicalRecordId: 'mr-1', procedureCode: 'PROC-001', description: 'Extraccion', notes: null, performedAt: '2025-06-20T10:00:00Z' }
      mockPost.mockResolvedValue({ data: proc })
      await addProcedure('mr-1', { appointmentId: 'apt-1', medicalRecordId: 'mr-1', procedureCode: 'PROC-001', description: 'Extraccion', performedAt: '2025-06-20T10:00:00Z' })
      expect(mockPost).toHaveBeenCalledWith('/medical-records/mr-1/procedures', expect.objectContaining({ procedureCode: 'PROC-001' }))
    })
  })
})

describe('medical records adapters', () => {
  describe('toMedicalRecordCreateRequest', () => {
    it('builds request with vital signs and nullifies empty optionals', () => {
      const values: CompleteAppointmentFormValues = {
        clinicalNotes: ' Notas ', physicalExam: '  ', bloodPressure: '120/80',
        heartRate: 72, temperature: 36.5,
      }
      const result = toMedicalRecordCreateRequest('apt-1', 'p-1', values)
      expect(result.clinicalNotes).toBe('Notas')
      expect(result.physicalExam).toBeNull()
      expect(result.vitalSigns).not.toBeNull()
      expect((result.vitalSigns as Record<string, unknown>).bloodPressure).toBe('120/80')
      expect((result.vitalSigns as Record<string, unknown>).heartRate).toBe(72)
      expect((result.vitalSigns as Record<string, unknown>).temperature).toBe(36.5)
    })

    it('returns null vitalSigns when no vitals provided', () => {
      const values: CompleteAppointmentFormValues = { clinicalNotes: 'Notas' }
      const result = toMedicalRecordCreateRequest('apt-1', 'p-1', values)
      expect(result.vitalSigns).toBeNull()
    })
  })

  describe('toDiagnosisCreateRequest', () => {
    it('uppercases ICD-10 code and nullifies optional severity', () => {
      const values: DiagnosisFormValues = {
        icd10Code: 'j06.9', description: ' Infeccion ', diagnosedAt: '2025-06-20',
      }
      const result = toDiagnosisCreateRequest('apt-1', 'mr-1', values)
      expect(result.icd10Code).toBe('J06.9')
      expect(result.description).toBe('Infeccion')
      expect(result.severity).toBeNull()
    })

    it('preserves severity when provided', () => {
      const values: DiagnosisFormValues = {
        icd10Code: 'J06.9', description: 'Infeccion', diagnosedAt: '2025-06-20', severity: 'moderate',
      }
      const result = toDiagnosisCreateRequest('apt-1', 'mr-1', values)
      expect(result.severity).toBe('moderate')
    })
  })

  describe('toPrescriptionCreateRequest', () => {
    it('trims strings and nullifies empty instructions', () => {
      const values: PrescriptionFormValues = {
        medicationId: 'med-1', dosage: ' 400mg ', frequency: ' Cada 8h ',
        durationDays: 7, instructions: '  ',
      }
      const result = toPrescriptionCreateRequest('apt-1', 'mr-1', values)
      expect(result.dosage).toBe('400mg')
      expect(result.frequency).toBe('Cada 8h')
      expect(result.instructions).toBeNull()
    })
  })

  describe('toProcedureCreateRequest', () => {
    it('trims strings and converts performedAt to ISO', () => {
      const values: ProcedureFormValues = {
        procedureCode: ' PROC-001 ', description: ' Extraccion ', notes: ' Sin complicaciones ',
        performedAt: '2025-06-20T10:30:00',
      }
      const result = toProcedureCreateRequest('apt-1', 'mr-1', values)
      expect(result.procedureCode).toBe('PROC-001')
      expect(result.description).toBe('Extraccion')
      expect(result.notes).toBe('Sin complicaciones')
      expect(result.performedAt).toContain('T')
    })

    it('nullifies empty notes', () => {
      const values: ProcedureFormValues = {
        procedureCode: 'P-001', description: 'Procedimiento', performedAt: '2025-06-20T10:30:00',
      }
      const result = toProcedureCreateRequest('apt-1', 'mr-1', values)
      expect(result.notes).toBeNull()
    })
  })
})
