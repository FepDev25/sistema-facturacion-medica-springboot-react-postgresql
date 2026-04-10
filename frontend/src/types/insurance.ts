// ── Insurance Policy ──────────────────────────────────────────────────────────

export interface InsurancePolicyCreateRequest {
  patientId: string
  providerId: string
  policyNumber: string
  coveragePercentage: number   // 0–100
  deductible: number           // >= 0
  startDate: string            // LocalDate → "YYYY-MM-DD"
  endDate: string              // LocalDate → "YYYY-MM-DD"
}

export interface InsurancePolicyUpdateRequest {
  coveragePercentage: number   // 0–100
  deductible?: number | null   // >= 0
  startDate?: string | null    // LocalDate → "YYYY-MM-DD"
  endDate?: string | null      // LocalDate → "YYYY-MM-DD"
  isActive?: boolean | null
}

export interface InsurancePolicyResponse {
  id: string
  patientId: string
  patientFirstName: string
  patientLastName: string
  providerId: string
  providerName: string
  policyNumber: string
  coveragePercentage: number
  deductible: number
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
}

// Embedded in InvoiceResponse
export interface InsurancePolicySummaryResponse {
  id: string
  policyNumber: string
  coveragePercentage: number
  providerName: string
  isActive: boolean
}
