import { useQuery } from '@tanstack/react-query'
import * as authApi from '../api/authApi'

export const profileKeys = {
  all: ['profile'] as const,
}

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.all,
    queryFn: authApi.getProfile,
    staleTime: 5 * 60 * 1000,
  })
}
