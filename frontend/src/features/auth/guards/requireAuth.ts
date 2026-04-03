import { redirect } from '@tanstack/react-router'
import { isAuthenticated } from '../store/authSessionStore'

export function requireAuth(redirectTo: string) {
  if (!isAuthenticated()) {
    throw redirect({
      to: '/login',
      search: { redirect: redirectTo },
    })
  }
}
