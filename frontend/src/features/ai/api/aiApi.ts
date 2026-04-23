import { apiClient } from '@/lib/axios'
import type { Icd10SuggestionResult } from '@/types/ai'

export async function suggestIcd10(query: string): Promise<Icd10SuggestionResult> {
  const response = await apiClient.post<Icd10SuggestionResult>('/ai/icd10/suggest', { query })
  return response.data
}
