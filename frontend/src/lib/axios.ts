import axios, { AxiosError } from 'axios'
import {
  clearAuthSession,
  getAccessToken,
  getAuthSessionState,
  setAuthSession,
} from '@/features/auth/store/authSessionStore'

interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string | null
  tokenType: 'Bearer'
  role: 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST'
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1'

const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/logout']

let refreshInFlight: Promise<string | null> | null = null

function isAuthEndpoint(url?: string): boolean {
  if (!url) {
    return false
  }

  return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint))
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getAuthSessionState().refreshToken
  if (!refreshToken) {
    clearAuthSession()
    return null
  }

  if (refreshInFlight) {
    return refreshInFlight
  }

  refreshInFlight = (async () => {
    try {
      const response = await axios.post<RefreshTokenResponse>(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )

      setAuthSession(response.data)
      return response.data.accessToken
    } catch {
      clearAuthSession()
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  if (isAuthEndpoint(config.url)) {
    return config
  }

  const accessToken = getAccessToken()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  } else if (config.headers.Authorization) {
    delete config.headers.Authorization
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const axiosError = error as AxiosError
    const originalRequest = axiosError.config as
      | (typeof axiosError.config & { _retry?: boolean })
      | undefined

    if (!originalRequest) {
      return Promise.reject(error)
    }

    const status = axiosError.response?.status
    if (status !== 401 || originalRequest._retry || isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    const refreshedAccessToken = await refreshAccessToken()
    if (!refreshedAccessToken) {
      return Promise.reject(error)
    }

    originalRequest.headers = originalRequest.headers ?? {}
    originalRequest.headers.Authorization = `Bearer ${refreshedAccessToken}`

    return apiClient(originalRequest)
  },
)
