import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as aiApi from '../api/aiApi'
import type { RecordExtractionRequest } from '@/types/ai'

export function useSuggestIcd10() {
  return useMutation({
    mutationFn: (query: string) => aiApi.suggestIcd10(query),
    onError: () => {
      toast.error('Error al buscar códigos ICD-10. Intente de nuevo.')
    },
  })
}

export function useExtractRecord() {
  return useMutation({
    mutationFn: (data: RecordExtractionRequest) => aiApi.extractRecord(data),
    onError: () => {
      toast.error('Error al analizar las notas clínicas. Intente de nuevo.')
    },
  })
}
