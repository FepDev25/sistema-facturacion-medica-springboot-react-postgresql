import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createAllProviders } from '@/test/test-utils'
import { toast } from 'sonner'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/auth/store/authSessionStore', () => ({
  setAuthSession: vi.fn(),
  clearAuthSession: vi.fn(),
}))

import * as authApi from '@/features/auth/api/authApi'
import { useLogin, useLogout } from '@/features/auth/hooks/useAuth'
import { useProfile } from '@/features/auth/hooks/useProfile'
import { clearAuthSession, setAuthSession } from '@/features/auth/store/authSessionStore'

const mockLogin = vi.spyOn(authApi, 'login')
const mockLogout = vi.spyOn(authApi, 'logout')
const mockGetProfile = vi.spyOn(authApi, 'getProfile')

const session = {
  role: 'ADMIN' as const,
  userId: 'u-1',
  username: 'admin',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useLogin', () => {
  it('calls login API and sets session on success', async () => {
    mockLogin.mockResolvedValue(session)

    const { result } = renderHook(() => useLogin(), { wrapper: createAllProviders() })
    result.current.mutate({ username: 'admin', password: 'pass' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockLogin).toHaveBeenCalledWith(
      { username: 'admin', password: 'pass' },
      expect.anything(),
    )
  })

  it('calls setAuthSession and shows success toast on success', async () => {
    mockLogin.mockResolvedValue(session)

    const { result } = renderHook(() => useLogin(), { wrapper: createAllProviders() })
    result.current.mutate({ username: 'admin', password: 'pass' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(setAuthSession).toHaveBeenCalledWith(session)
    expect(toast.success).toHaveBeenCalledWith('Sesión iniciada')
  })

  it('shows specific toast on 401 error', async () => {
    const error = { response: { status: 401, data: { message: 'Usuario no encontrado' } } }
    mockLogin.mockRejectedValue(error)

    const { result } = renderHook(() => useLogin(), { wrapper: createAllProviders() })
    result.current.mutate({ username: 'bad', password: 'bad' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Usuario no encontrado')
  })

  it('shows the backend message on 429', async () => {
    const error = {
      response: {
        status: 429,
        data: { message: 'Demasiados intentos de inicio de sesión.' },
      },
    }
    mockLogin.mockRejectedValue(error)

    const { result } = renderHook(() => useLogin(), { wrapper: createAllProviders() })
    result.current.mutate({ username: 'admin', password: 'pass' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Demasiados intentos de inicio de sesión.')
  })

  it('shows a fallback toast on 429 without message', async () => {
    const error = { response: { status: 429, data: {} } }
    mockLogin.mockRejectedValue(error)

    const { result } = renderHook(() => useLogin(), { wrapper: createAllProviders() })
    result.current.mutate({ username: 'admin', password: 'pass' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith(
      'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
    )
  })

  it('shows default 401 toast when no message', async () => {
    const error = { response: { status: 401, data: {} } }
    mockLogin.mockRejectedValue(error)

    const { result } = renderHook(() => useLogin(), { wrapper: createAllProviders() })
    result.current.mutate({ username: 'bad', password: 'bad' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Credenciales inválidas')
  })

  it('shows server error toast on 500 error', async () => {
    const error = { response: { status: 500, data: { message: 'DB down' } } }
    mockLogin.mockRejectedValue(error)

    const { result } = renderHook(() => useLogin(), { wrapper: createAllProviders() })
    result.current.mutate({ username: 'admin', password: 'pass' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error interno del servidor. Intenta nuevamente.')
  })

  it('shows fallback toast on generic error', async () => {
    const error = new Error('Network error')
    mockLogin.mockRejectedValue(error)

    const { result } = renderHook(() => useLogin(), { wrapper: createAllProviders() })
    result.current.mutate({ username: 'admin', password: 'pass' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('No se pudo iniciar sesión')
  })
})

describe('useLogout', () => {
  it('calls the logout API and clears the session', async () => {
    mockLogout.mockResolvedValue(undefined)

    const { result } = renderHook(() => useLogout(), { wrapper: createAllProviders() })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockLogout).toHaveBeenCalled()
  })

  it('calls clearAuthSession and shows success toast', async () => {
    mockLogout.mockResolvedValue(undefined)

    const { result } = renderHook(() => useLogout(), { wrapper: createAllProviders() })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(clearAuthSession).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Sesión cerrada')
  })

  it('shows error toast and still clears session on error', async () => {
    mockLogout.mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useLogout(), { wrapper: createAllProviders() })
    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(clearAuthSession).toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Sesión finalizada')
  })
})

describe('useProfile', () => {
  it('fetches profile from auth/me', async () => {
    const profile = {
      id: 'u-1',
      username: 'admin',
      email: 'a@b.com',
      role: 'ADMIN' as const,
      active: true,
      doctorId: null,
      doctorFirstName: null,
      doctorLastName: null,
    }
    mockGetProfile.mockResolvedValue(profile)

    const { result } = renderHook(() => useProfile(), { wrapper: createAllProviders() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockGetProfile).toHaveBeenCalledTimes(1)
    expect(result.current.data?.username).toBe('admin')
  })
})
