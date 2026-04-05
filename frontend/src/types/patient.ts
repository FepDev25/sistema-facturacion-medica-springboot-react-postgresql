import type { Gender } from './enums'

// ── Requests ──────────────────────────────────────────────────────────────────

export interface PatientCreateRequest {
  dni: string
  firstName: string
  lastName: string
  birthDate: string       // LocalDate → ISO "YYYY-MM-DD"
  gender: Gender
  phone: string
  email?: string | null
  address?: string | null
  bloodType?: string | null
  allergies?: string | null
}

// dni, birthDate, gender are immutable after registration (backend rule)
export interface PatientUpdateRequest {
  firstName: string
  lastName: string
  birthDate: string
  gender: Gender
  phone: string
  email?: string | null
  address?: string | null
  bloodType?: string | null
  allergies?: string | null
}

// ── Responses ─────────────────────────────────────────────────────────────────

export interface PatientResponse {
  id: string
  dni: string
  firstName: string
  lastName: string
  birthDate: string
  gender: Gender
  phone: string
  email: string | null
  address: string | null
  bloodType: string | null
  allergies: string | null
  createdAt: string       // OffsetDateTime → ISO string
  updatedAt: string
}

// Embedded in AppointmentResponse, InvoiceResponse, MedicalRecordResponse, etc.
export interface PatientSummaryResponse {
  id: string
  dni: string
  firstName: string
  lastName: string
  allergies: string | null
}
