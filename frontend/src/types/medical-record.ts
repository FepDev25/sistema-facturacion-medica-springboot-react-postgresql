import type { Severity } from './enums'

export interface VitalSigns {
  bloodPressure?: string
  heartRate?: number
  temperature?: number
  oxygenSaturation?: number
  weight?: number
  height?: number
  glucose?: number
  [key: string]: string | number | undefined
}

export interface MedicalRecordCreateRequest {
  appointmentId: string
  patientId: string
  vitalSigns?: Record<string, unknown> | null
  physicalExam?: string | null
  clinicalNotes: string
  recordDate: string
}

export interface MedicalRecordResponse {
  id: string
  patientId: string
  patientFirstName: string
  patientLastName: string
  appointmentId: string
  vitalSigns: Record<string, unknown> | null
  physicalExam: string | null
  clinicalNotes: string
  recordDate: string
  createdAt: string
  updatedAt: string
}

export interface DiagnosisCreateRequest {
  appointmentId: string
  medicalRecordId: string
  icd10Code: string
  description: string
  severity?: Severity | null
  diagnosedAt: string
}

export interface DiagnosisResponse {
  id: string
  appointmentId: string
  medicalRecordId: string
  icd10Code: string
  description: string
  severity: Severity | null
  diagnosedAt: string
  createdAt: string
}

export interface PrescriptionCreateRequest {
  appointmentId: string
  medicalRecordId: string
  medicationId: string
  dosage: string
  frequency: string
  durationDays: number
  instructions?: string | null
}

export interface PrescriptionResponse {
  id: string
  appointmentId: string
  medicalRecordId: string
  medicationId: string
  medicationName: string
  dosage: string
  frequency: string
  durationDays: number
  instructions: string | null
  createdAt: string
}

export interface ProcedureCreateRequest {
  appointmentId: string
  medicalRecordId: string
  procedureCode: string
  description: string
  notes?: string | null
  performedAt: string
}

export interface ProcedureResponse {
  id: string
  appointmentId: string
  medicalRecordId: string
  procedureCode: string
  description: string
  notes: string | null
  performedAt: string
  createdAt: string
}
