// P1 — ICD-10 suggestion
export interface Icd10Suggestion {
  code: string
  description: string
  score: number
}
export interface Icd10SuggestionResult {
  suggestions: Icd10Suggestion[]
}

// P2 — Clinical notes extraction
export interface ExtractedDiagnosis {
  icd10Code: string
  description: string
  severity: string | null
}
export interface ExtractedPrescription {
  medicationName: string
  matchedMedicationId: string | null
  dosage: string
  frequency: string
  durationDays: number
  instructions: string | null
}
export interface ExtractedProcedure {
  code: string
  description: string
  notes: string | null
}
export interface ExtractionResult {
  diagnoses: ExtractedDiagnosis[]
  prescriptions: ExtractedPrescription[]
  procedures: ExtractedProcedure[]
}
export interface RecordExtractionRequest {
  medicalRecordId: string
  appointmentId: string
  clinicalNotes: string
}

// P3 — Patient history query
export interface HistorySource {
  medicalRecordId: string
  recordDate: string
}
export interface PatientHistoryAnswer {
  answer: string
  sources: HistorySource[]
}
export interface PatientHistoryQuery {
  question: string
}

// P4 — Invoice item suggestion
export type InvoiceItemType = 'service' | 'medication' | 'procedure' | 'other'
export interface SuggestedItem {
  itemType: InvoiceItemType
  name: string
  matchedCatalogId: string | null
  unitPrice: number | null
  justification: string
}
export interface ItemSuggestionResult {
  suggestedItems: SuggestedItem[]
}
