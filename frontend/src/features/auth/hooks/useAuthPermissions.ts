import type { AuthRole } from '../api/authApi'
import {
  hasAnyRole,
  hasRole,
  isAuthenticated,
  useAuthSession,
} from '../store/authSessionStore'

export function useAuthPermissions() {
  const session = useAuthSession()

  return {
    session,
    isAuthenticated: isAuthenticated(),
    hasRole: (role: AuthRole) => hasRole(role),
    hasAnyRole: (roles: readonly AuthRole[]) => hasAnyRole(roles),
  }
}
