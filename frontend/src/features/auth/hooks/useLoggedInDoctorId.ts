import { useProfile } from './useProfile'

export function useLoggedInDoctorId(): string | null {
  const { data: profile } = useProfile()
  return profile?.doctorId ?? null
}
