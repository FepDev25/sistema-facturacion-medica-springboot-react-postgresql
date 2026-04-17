import { redirect } from '@tanstack/react-router'
import { isAuthenticated, hasAnyRole } from '../store/authSessionStore'
import type { AuthRole } from '../api/authApi'

export function requireAuth(redirectTo: string) {
  if (!isAuthenticated()) {
    throw redirect({
      to: '/login',
      search: { redirect: redirectTo },
    })
  }
}

export function requireRole(roles: readonly AuthRole[], redirectTo: string) {
  requireAuth(redirectTo)
  if (!hasAnyRole(roles)) {
    throw redirect({ to: '/' })
  }
}
