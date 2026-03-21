// ── Requests ──────────────────────────────────────────────────────────────────

export interface DoctorCreateRequest {
  licenseNumber: string
  firstName: string
  lastName: string
  specialty: string
  phone: string
  email: string
}

// licenseNumber is immutable after registration
export interface DoctorUpdateRequest {
  firstName: string
  lastName: string
  specialty: string
  phone: string
  email: string
}

// ── Responses ─────────────────────────────────────────────────────────────────

export interface DoctorResponse {
  id: string
  licenseNumber: string
  firstName: string
  lastName: string
  specialty: string
  phone: string
  email: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Embedded in AppointmentResponse
export interface DoctorSummaryResponse {
  id: string
  licenseNumber: string
  firstName: string
  lastName: string
  specialty: string
}
