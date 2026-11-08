import { useSyncExternalStore } from 'react'
import type { AuthRole, TokenResponse } from '../api/authApi'

export interface AuthSessionState {
  accessToken: string | null
  refreshToken: string | null
  role: AuthRole | null
  userId: string | null
  username: string | null
}

const INITIAL_STATE: AuthSessionState = {
  accessToken: null,
  refreshToken: null,
  role: null,
  userId: null,
  username: null,
}

// La sesion se persiste en localStorage para sobrevivir a un F5 y compartirse entre
// pestañas. Es la alternativa pragmatica a la cookie httpOnly: el access token queda
// accesible para JS, asi que el endurecimiento pendiente es mover la sesion a una
// cookie httpOnly + SameSite emitida por el backend.
const STORAGE_KEY = 'sfm.auth.session.v1'

const listeners = new Set<() => void>()

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function isAuthRole(value: unknown): value is AuthRole {
  return value === 'ADMIN' || value === 'DOCTOR' || value === 'RECEPTIONIST'
}

function parseSession(raw: string | null): AuthSessionState | null {
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthSessionState> | null
    if (!parsed || typeof parsed !== 'object') {
      return null
    }
    if (typeof parsed.accessToken !== 'string' || parsed.accessToken.length === 0) {
      return null
    }
    if (!isAuthRole(parsed.role)) {
      return null
    }
    if (typeof parsed.userId !== 'string' || typeof parsed.username !== 'string') {
      return null
    }
    if (parsed.refreshToken !== null && typeof parsed.refreshToken !== 'string') {
      return null
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken ?? null,
      role: parsed.role,
      userId: parsed.userId,
      username: parsed.username,
    }
  } catch {
    return null
  }
}

function readPersistedSession(): AuthSessionState {
  const storage = getStorage()
  if (!storage) {
    return INITIAL_STATE
  }

  const stored = storage.getItem(STORAGE_KEY)
  if (!stored) {
    return INITIAL_STATE
  }

  const session = parseSession(stored)
  if (!session) {
    storage.removeItem(STORAGE_KEY)
    return INITIAL_STATE
  }

  return session
}

function persistSession() {
  const storage = getStorage()
  if (!storage) {
    return
  }

  if (authSessionState.accessToken === null) {
    storage.removeItem(STORAGE_KEY)
    return
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(authSessionState))
}

function emitChange() {
  listeners.forEach((listener) => listener())
}

let authSessionState: AuthSessionState = readPersistedSession()

// Mantiene sincronizadas las pestañas: si una cierra sesion o rota el refresh token,
// las demas ven el cambio sin esperar a un 401.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) {
      return
    }

    authSessionState = event.newValue
      ? (parseSession(event.newValue) ?? INITIAL_STATE)
      : INITIAL_STATE
    emitChange()
  })
}

export function subscribeAuthSession(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAuthSessionState(): AuthSessionState {
  return authSessionState
}

export function setAuthSession(tokens: TokenResponse) {
  const previous = authSessionState

  authSessionState = {
    accessToken: tokens.accessToken,
    // Defensa ante un backend viejo que responde refreshToken: null: conservar el
    // token anterior evita que el siguiente refresh cierre la sesion.
    refreshToken: tokens.refreshToken ?? previous.refreshToken,
    role: tokens.role,
    userId: tokens.userId,
    username: tokens.username,
  }

  persistSession()
  emitChange()
}

export function clearAuthSession() {
  authSessionState = INITIAL_STATE
  persistSession()
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
