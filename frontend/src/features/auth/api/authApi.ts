import { z } from 'zod'
import { apiClient } from '@/lib/axios'

export type AuthRole = 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST'

export interface LoginRequest {
  username: string
  password: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface LogoutRequest {
  refreshToken: string
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string | null
  tokenType: 'Bearer'
  role: AuthRole
}

export const LoginFormSchema = z.object({
  username: z.string().min(1, 'Requerido'),
  password: z.string().min(1, 'Requerido'),
})

export type LoginFormValues = z.infer<typeof LoginFormSchema>

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const response = await apiClient.post<TokenResponse>('/auth/login', data)
  return response.data
}

export async function refreshToken(
  data: RefreshTokenRequest,
): Promise<TokenResponse> {
  const response = await apiClient.post<TokenResponse>('/auth/refresh', data)
  return response.data
}

export async function logout(data: LogoutRequest): Promise<void> {
  await apiClient.post('/auth/logout', data)
}
