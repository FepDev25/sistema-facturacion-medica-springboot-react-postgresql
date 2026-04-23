import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as aiApi from '../api/aiApi'

export function useSuggestIcd10() {
  return useMutation({
    mutationFn: (query: string) => aiApi.suggestIcd10(query),
    onError: () => {
      toast.error('Error al buscar códigos ICD-10. Intente de nuevo.')
    },
  })
}
