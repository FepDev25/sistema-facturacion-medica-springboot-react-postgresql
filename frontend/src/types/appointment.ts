import type { AppointmentStatus } from './enums'
import type { PatientSummaryResponse } from './patient'
import type { DoctorSummaryResponse } from './doctor'

// ── Requests ──────────────────────────────────────────────────────────────────

export interface AppointmentCreateRequest {
  patientId: string
  doctorId: string
  scheduledAt: string          // OffsetDateTime → ISO string
  durationMinutes: number      // 1–480
  chiefComplaint: string
  notes?: string | null
}

export interface AppointmentStatusUpdateRequest {
  status: AppointmentStatus
  notes?: string | null
}

// ── Responses ─────────────────────────────────────────────────────────────────

export interface AppointmentResponse {
  id: string
  patient: PatientSummaryResponse
  doctor: DoctorSummaryResponse
  scheduledAt: string
  scheduledEndAt: string
  durationMinutes: number
  status: AppointmentStatus
  chiefComplaint: string
  notes: string | null
  createdAt: string
}

// Embedded in MedicalRecordResponse, InvoiceResponse
export interface AppointmentSummaryResponse {
  id: string
  scheduledAt: string
  status: AppointmentStatus
  chiefComplaint: string
}
