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
  isActive: boolean
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
  userId: string | null
  username: string | null
  createdAt: string | null
  updatedAt: string | null
}

// Paginated list projection (flat fields from backend)
export interface DoctorSummaryResponse {
  id: string
  firstName: string
  lastName: string
  specialty: string
}
