import type { ServiceCategory, MedicationUnit, CatalogType } from './enums'

// ── Services Catalog ──────────────────────────────────────────────────────────

export interface ServiceCreateRequest {
  code: string
  name: string
  description?: string | null
  price: number
  category: ServiceCategory
}

// code is immutable after creation
export interface ServiceUpdateRequest {
  name: string
  description?: string | null
  price: number
  category: ServiceCategory
  isActive: boolean
}

export interface ServiceResponse {
  id: string
  code: string
  name: string
  description: string | null
  price: number
  category: ServiceCategory
  isActive: boolean
}

// Embedded in InvoiceItemResponse
export interface ServiceSummaryResponse {
  id: string
  code: string
  name: string
  price: number
}

// ── Medications Catalog ───────────────────────────────────────────────────────

export interface MedicationCreateRequest {
  code: string
  name: string
  description?: string | null
  price: number
  unit: MedicationUnit
  requiresPrescription: boolean
}

// code is immutable after creation
export interface MedicationUpdateRequest {
  name: string
  description?: string | null
  price: number
  unit: MedicationUnit
  requiresPrescription: boolean
  isActive: boolean
}

export interface MedicationResponse {
  id: string
  code: string
  name: string
  description: string | null
  price: number
  unit: MedicationUnit
  requiresPrescription: boolean
  isActive: boolean
}

// Embedded in PrescriptionResponse and InvoiceItemResponse
export interface MedicationSummaryResponse {
  id: string
  code: string
  name: string
  requiresPrescription: boolean
}

// ── Catalog Price History ─────────────────────────────────────────────────────

// Read-only — written internally by the backend on price updates (RN-18)
export interface CatalogPriceHistoryResponse {
  id: string
  catalogType: CatalogType
  itemCode: string
  itemName: string
  oldPrice: number
  newPrice: number
  changedAt: string
}
