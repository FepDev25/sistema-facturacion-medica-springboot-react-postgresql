import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as authApi from '../api/authApi'
import {
  clearAuthSession,
  getAuthSessionState,
  setAuthSession,
} from '../store/authSessionStore'

export function useLogin() {
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (tokens) => {
      setAuthSession(tokens)
      toast.success('Sesión iniciada')
    },
    onError: () => {
      toast.error('Credenciales inválidas')
    },
  })
}

export function useRefreshSession() {
  return useMutation({
    mutationFn: authApi.refreshToken,
    onSuccess: (tokens) => {
      setAuthSession(tokens)
    },
    onError: () => {
      clearAuthSession()
    },
  })
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const refreshToken = getAuthSessionState().refreshToken
      if (refreshToken) {
        await authApi.logout({ refreshToken })
      }
    },
    onSuccess: () => {
      clearAuthSession()
      toast.success('Sesión cerrada')
    },
    onError: () => {
      clearAuthSession()
      toast.error('Sesión finalizada')
    },
  })
}
