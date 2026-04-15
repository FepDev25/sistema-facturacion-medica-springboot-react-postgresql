import type { AppointmentStatus } from './enums'

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
  patientId: string
  patientFirstName: string
  patientLastName: string
  doctorId: string
  doctorFirstName: string
  doctorLastName: string
  scheduledAt: string
  scheduledEndAt: string
  durationMinutes: number
  status: AppointmentStatus
  invoiceId: string | null
  invoiceNumber: string | null
  chiefComplaint: string | null
  notes: string | null
  createdAt: string | null
  updatedAt: string | null
}

// Paginated list projection (flat fields from backend)
export interface AppointmentSummaryResponse {
  id: string
  patientFirstName: string
  patientLastName: string
  doctorFirstName: string
  doctorLastName: string
  scheduledAt: string
  status: AppointmentStatus
}
