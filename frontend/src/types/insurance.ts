import type { PatientSummaryResponse } from './patient'

// ── Insurance Provider ────────────────────────────────────────────────────────

export interface InsuranceProviderCreateRequest {
  name: string
  code: string
  phone: string
  email?: string | null
  address?: string | null
}

// code is immutable after registration
export interface InsuranceProviderUpdateRequest {
  name: string
  phone: string
  email?: string | null
  address?: string | null
  isActive: boolean
}

export interface InsuranceProviderResponse {
  id: string
  name: string
  code: string
  phone: string
  email: string | null
  address: string | null
  isActive: boolean
}

// Embedded in InsurancePolicyResponse
export interface InsuranceProviderSummaryResponse {
  id: string
  name: string
  code: string
}

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
  patient: PatientSummaryResponse
  provider: InsuranceProviderSummaryResponse
  policyNumber: string
  coveragePercentage: number
  deductible: number
  startDate: string
  endDate: string
  isActive: boolean
}

// Embedded in InvoiceResponse
export interface InsurancePolicySummaryResponse {
  id: string
  policyNumber: string
  coveragePercentage: number
  providerName: string
}
