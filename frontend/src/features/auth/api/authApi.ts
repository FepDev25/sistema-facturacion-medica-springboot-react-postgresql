import { z } from 'zod'
import { apiClient } from '@/lib/axios'

export type AuthRole = 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST'

export interface LoginRequest {
  username: string
  password: string
}

/** Datos no sensibles de la sesion. Los tokens viven en cookies httpOnly. */
export interface SessionResponse {
  role: AuthRole
  userId: string
  username: string
}

export interface UserProfileResponse {
  id: string
  username: string
  email: string
  role: AuthRole
  active: boolean
  doctorId: string | null
  doctorFirstName: string | null
  doctorLastName: string | null
}

export const LoginFormSchema = z.object({
  username: z.string().min(1, 'Requerido'),
  password: z.string().min(1, 'Requerido'),
})

export type LoginFormValues = z.infer<typeof LoginFormSchema>

export async function login(data: LoginRequest): Promise<SessionResponse> {
  const response = await apiClient.post<SessionResponse>('/auth/login', data)
  return response.data
}

/** Rota el refresh token; la cookie httpOnly viaja y se reemplaza automaticamente. */
export async function refreshSession(): Promise<SessionResponse> {
  const response = await apiClient.post<SessionResponse>('/auth/refresh')
  return response.data
}

/** Revoca la familia de refresh tokens y limpia las cookies en el backend. */
export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout')
}

export async function getProfile(): Promise<UserProfileResponse> {
  const response = await apiClient.get<UserProfileResponse>('/auth/me')
  return response.data
}
