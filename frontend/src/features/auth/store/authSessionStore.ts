import { useSyncExternalStore } from 'react'
import type { AuthRole, SessionResponse } from '../api/authApi'

export interface AuthSessionState {
  authenticated: boolean
  role: AuthRole | null
  userId: string | null
  username: string | null
}

const INITIAL_STATE: AuthSessionState = {
  authenticated: false,
  role: null,
  userId: null,
  username: null,
}

// Solo se persisten datos no sensibles (rol, id y username) para sobrevivir a un F5
// y mantener el filtrado de navegacion sin pedir /me antes de renderizar. Los tokens
// viven en cookies httpOnly: JavaScript no puede leerlos ni exfiltrados por XSS.
const STORAGE_KEY = 'sfm.auth.session.v2'
const LEGACY_STORAGE_KEY = 'sfm.auth.session.v1'

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
    if (parsed.authenticated !== true || !isAuthRole(parsed.role)) {
      return null
    }
    if (typeof parsed.userId !== 'string' || typeof parsed.username !== 'string') {
      return null
    }

    return {
      authenticated: true,
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

  // Limpieza de la version anterior, que guardaba access/refresh tokens en claro.
  storage.removeItem(LEGACY_STORAGE_KEY)

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

  // Limpieza oportunista de la version anterior, que guardaba tokens en claro.
  storage.removeItem(LEGACY_STORAGE_KEY)

  if (!authSessionState.authenticated) {
    storage.removeItem(STORAGE_KEY)
    return
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(authSessionState))
}

function emitChange() {
  listeners.forEach((listener) => listener())
}

let authSessionState: AuthSessionState = readPersistedSession()

// Mantiene sincronizadas las pestañas: si una inicia o cierra sesion, las demas
// actualizan su navegacion sin esperar a un 401.
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

export function setAuthSession(session: SessionResponse) {
  authSessionState = {
    authenticated: true,
    role: session.role,
    userId: session.userId,
    username: session.username,
  }

  persistSession()
  emitChange()
}

export function clearAuthSession() {
  authSessionState = INITIAL_STATE
  persistSession()
  emitChange()
}

export function isAuthenticated(): boolean {
  return authSessionState.authenticated
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
