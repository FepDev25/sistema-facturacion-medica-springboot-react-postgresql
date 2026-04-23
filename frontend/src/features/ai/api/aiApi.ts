import { apiClient } from '@/lib/axios'
import type {
  ExtractionResult,
  Icd10SuggestionResult,
  ItemSuggestionResult,
  RecordExtractionRequest,
} from '@/types/ai'

export async function suggestIcd10(query: string): Promise<Icd10SuggestionResult> {
  const response = await apiClient.post<Icd10SuggestionResult>('/ai/icd10/suggest', { query })
  return response.data
}

export async function extractRecord(data: RecordExtractionRequest): Promise<ExtractionResult> {
  const response = await apiClient.post<ExtractionResult>('/ai/records/extract', data)
  return response.data
}

export async function suggestItems(invoiceId: string): Promise<ItemSuggestionResult> {
  const response = await apiClient.post<ItemSuggestionResult>(
    `/ai/invoices/${invoiceId}/suggest-items`,
  )
  return response.data
}
