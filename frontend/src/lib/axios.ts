import axios, { AxiosError } from 'axios'
import { toast } from 'sonner'
import {
  clearAuthSession,
  isAuthenticated,
  setAuthSession,
} from '@/features/auth/store/authSessionStore'

interface SessionResponse {
  role: 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST'
  userId: string
  username: string
}

// La API se sirve bajo el mismo origen: rewrite de Vercel en produccion y proxy de
// Vite en desarrollo. Asi las cookies httpOnly son first-party y SameSite=Strict
// funciona sin depender de cookies de terceros.
const API_BASE_URL = '/api/v1'

const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/logout']

const REFRESH_LOCK = 'sfm-auth-refresh'
const LAST_REFRESH_KEY = 'sfm.auth.last-refresh'
const REFRESH_COOLDOWN_MS = 2_000

let refreshInFlight: Promise<boolean> | null = null
let redirectingToLogin = false
let lastForbiddenToastAt = 0

interface ApiErrorPayload {
  status?: number
  error?: string
  message?: string
  path?: string
}

interface LockManagerLike {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>
}

function isAuthEndpoint(url?: string): boolean {
  if (!url) {
    return false
  }

  return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint))
}

function redirectToLogin() {
  if (redirectingToLogin) {
    return
  }

  const { pathname, search } = window.location
  if (pathname === '/login') {
    return
  }

  redirectingToLogin = true
  const redirectTarget = `${pathname}${search}`
  const loginUrl = `/login?redirect=${encodeURIComponent(redirectTarget)}`
  window.location.assign(loginUrl)
}

function notifyForbiddenOnce(message?: string) {
  const now = Date.now()
  if (now - lastForbiddenToastAt < 1500) {
    return
  }

  lastForbiddenToastAt = now
  toast.error(message ?? 'No tienes permisos para esta acción.')
}

function getApiErrorPayload(data: unknown): ApiErrorPayload | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  const payload = data as Record<string, unknown>
  return {
    status: typeof payload.status === 'number' ? payload.status : undefined,
    error: typeof payload.error === 'string' ? payload.error : undefined,
    message: typeof payload.message === 'string' ? payload.message : undefined,
    path: typeof payload.path === 'string' ? payload.path : undefined,
  }
}

function hasPermissionMessage(message?: string): boolean {
  if (!message) {
    return false
  }

  const normalized = message.toLowerCase()
  return (
    normalized.includes('permiso') ||
    normalized.includes('acceso denegado') ||
    normalized.includes('forbidden')
  )
}

/**
 * Serializa el refresh entre pestañas con Web Locks. Sin esto, dos pestañas podrian
 * presentar el mismo refresh token a la vez; el backend lo tolera dentro de la
 * ventana de gracia, pero el lock evita rotaciones innecesarias.
 */
function withRefreshLock<T>(callback: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined') {
    return callback()
  }

  const locks = (navigator as unknown as { locks?: LockManagerLike }).locks
  if (!locks?.request) {
    return callback()
  }

  return locks.request(REFRESH_LOCK, callback)
}

function recentlyRefreshedElsewhere(): boolean {
  try {
    const last = Number(window.localStorage.getItem(LAST_REFRESH_KEY))
    if (!Number.isFinite(last) || last <= 0) {
      return false
    }
    const elapsed = Date.now() - last
    return elapsed >= 0 && elapsed < REFRESH_COOLDOWN_MS
  } catch {
    return false
  }
}

function markRefreshed() {
  try {
    window.localStorage.setItem(LAST_REFRESH_KEY, String(Date.now()))
  } catch {
    // localStorage no disponible: no es critico, solo perdemos la optimizacion.
  }
}

async function doRefresh(): Promise<boolean> {
  if (!isAuthenticated()) {
    clearAuthSession()
    redirectToLogin()
    return false
  }

  // Otra pestaña acaba de rotar la cookie: el navegador ya tiene una sesion valida.
  if (recentlyRefreshedElsewhere()) {
    return true
  }

  try {
    const response = await axios.post<SessionResponse>(`${API_BASE_URL}/auth/refresh`, undefined, {
      withCredentials: true,
    })

    setAuthSession(response.data)
    markRefreshed()
    return true
  } catch {
    clearAuthSession()
    redirectToLogin()
    return false
  }
}

export function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight
  }

  refreshInFlight = withRefreshLock(doRefresh).finally(() => {
    refreshInFlight = null
  })

  return refreshInFlight
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function handleResponseError(error: unknown) {
  const axiosError = error as AxiosError
  const originalRequest = axiosError.config as
    (typeof axiosError.config & { _retry?: boolean }) | undefined

  if (!originalRequest) {
    return Promise.reject(error)
  }

  const status = axiosError.response?.status
  const apiError = getApiErrorPayload(axiosError.response?.data)

  if (status === 403 && !isAuthEndpoint(originalRequest.url)) {
    if (apiError?.path === '/error') {
      toast.error('Error interno del servidor. Intenta nuevamente en unos segundos.')
    } else if (hasPermissionMessage(apiError?.message)) {
      notifyForbiddenOnce(apiError?.message)
    } else {
      toast.error(apiError?.message ?? 'No se pudo completar la solicitud (403).')
    }
    return Promise.reject(error)
  }

  if (status !== 401 || originalRequest._retry || isAuthEndpoint(originalRequest.url)) {
    return Promise.reject(error)
  }

  originalRequest._retry = true

  const refreshed = await refreshAccessToken()
  if (!refreshed) {
    redirectToLogin()
    return Promise.reject(error)
  }

  // La cookie de acceso ya viaja sola; evitamos reenviar un Bearer obsoleto si
  // algun cliente externo lo hubiera puesto manualmente.
  if (originalRequest.headers) {
    delete originalRequest.headers.Authorization
  }

  return apiClient(originalRequest)
}

apiClient.interceptors.response.use((response) => response, handleResponseError)
