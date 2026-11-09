import { useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { toast } from 'sonner'
import * as authApi from '../api/authApi'
import { clearAuthSession, setAuthSession } from '../store/authSessionStore'

export function useLogin() {
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (session) => {
      setAuthSession(session)
      toast.success('Sesión iniciada')
    },
    onError: (error) => {
      const axiosError = error as AxiosError<{ message?: string }>
      const status = axiosError.response?.status
      const message = axiosError.response?.data?.message

      if (status === 401) {
        toast.error(message ?? 'Credenciales inválidas')
        return
      }

      if (status === 429) {
        toast.error(message ?? 'Demasiados intentos. Espera unos minutos e intenta de nuevo.')
        return
      }

      if (status && status >= 500) {
        toast.error('Error interno del servidor. Intenta nuevamente.')
        return
      }

      toast.error(message ?? 'No se pudo iniciar sesión')
    },
  })
}

export function useLogout() {
  return useMutation({
    mutationFn: authApi.logout,
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
