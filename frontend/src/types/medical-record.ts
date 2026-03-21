import type { Severity } from './enums'
import type { PatientSummaryResponse } from './patient'
import type { AppointmentSummaryResponse } from './appointment'
import type { MedicationSummaryResponse } from './catalog'

// ── Vital Signs ───────────────────────────────────────────────────────────────

// Known fields rendered with explicit labels in the UI.
// Unknown backend fields surface in the `other` bucket as key/value pairs.
export interface VitalSigns {
  bloodPressure?: string         // e.g. "120/80 mmHg"
  heartRate?: number             // bpm
  temperature?: number           // °C
  oxygenSaturation?: number      // %
  weight?: number                // kg
  height?: number                // cm
  glucose?: number               // mg/dL
  [key: string]: string | number | undefined
}

// ── Medical Record ────────────────────────────────────────────────────────────

export interface MedicalRecordCreateRequest {
  appointmentId: string
  patientId: string
  vitalSigns?: VitalSigns | null
  physicalExam?: string | null
  clinicalNotes: string
  recordDate: string             // OffsetDateTime → ISO string
}

// Admin-only corrections (RN-08: records are immutable in production)
export interface MedicalRecordUpdateRequest {
  vitalSigns?: VitalSigns | null
  physicalExam?: string | null
  clinicalNotes: string
}

export interface MedicalRecordResponse {
  id: string
  patient: PatientSummaryResponse
  appointment: AppointmentSummaryResponse
  vitalSigns: VitalSigns | null
  physicalExam: string | null
  clinicalNotes: string
  recordDate: string
  diagnoses: DiagnosisResponse[]
  prescriptions: PrescriptionResponse[]
  procedures: ProcedureResponse[]
  createdAt: string
}

// ── Diagnosis ─────────────────────────────────────────────────────────────────

export interface DiagnosisCreateRequest {
  appointmentId: string
  medicalRecordId: string
  icd10Code: string              // max 10 chars
  description: string
  severity?: Severity | null
  diagnosedAt: string
}

export interface DiagnosisResponse {
  id: string
  icd10Code: string
  description: string
  severity: Severity | null
  diagnosedAt: string
}

// ── Prescription ──────────────────────────────────────────────────────────────

export interface PrescriptionCreateRequest {
  appointmentId: string
  medicalRecordId: string
  medicationId: string
  dosage: string
  frequency: string
  durationDays: number           // 1–365
  instructions?: string | null
}

export interface PrescriptionResponse {
  id: string
  medication: MedicationSummaryResponse
  dosage: string
  frequency: string
  durationDays: number
  instructions: string | null
  createdAt: string
}

// ── Procedure ─────────────────────────────────────────────────────────────────

export interface ProcedureCreateRequest {
  appointmentId: string
  medicalRecordId: string
  procedureCode: string          // max 50 chars
  description: string
  notes?: string | null
  performedAt: string
}

export interface ProcedureResponse {
  id: string
  procedureCode: string
  description: string
  notes: string | null
  performedAt: string
}
