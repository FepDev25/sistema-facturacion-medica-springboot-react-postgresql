import { useSyncExternalStore } from 'react'
import type { AuthRole, TokenResponse } from '../api/authApi'

export interface AuthSessionState {
  accessToken: string | null
  refreshToken: string | null
  role: AuthRole | null
}

const INITIAL_STATE: AuthSessionState = {
  accessToken: null,
  refreshToken: null,
  role: null,
}

let authSessionState: AuthSessionState = INITIAL_STATE
const listeners = new Set<() => void>()

function emitChange() {
  listeners.forEach((listener) => listener())
}

export function subscribeAuthSession(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAuthSessionState(): AuthSessionState {
  return authSessionState
}

export function setAuthSession(tokens: TokenResponse) {
  authSessionState = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    role: tokens.role,
  }
  emitChange()
}

export function clearAuthSession() {
  authSessionState = INITIAL_STATE
  emitChange()
}

export function getAccessToken(): string | null {
  return authSessionState.accessToken
}

export function isAuthenticated(): boolean {
  return !!authSessionState.accessToken
}

export function hasRole(role: AuthRole): boolean {
  return authSessionState.role === role
}

export function hasAnyRole(roles: readonly AuthRole[]): boolean {
  if (!authSessionState.role) {
    return false
  }
  return roles.includes(authSessionState.role)
}

export function useAuthSession() {
  return useSyncExternalStore(subscribeAuthSession, getAuthSessionState)
}
