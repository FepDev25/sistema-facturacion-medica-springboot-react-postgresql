import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createAllProviders } from '@/test/test-utils'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/auth/store/authSessionStore', () => ({
  setAuthSession: vi.fn(),
  clearAuthSession: vi.fn(),
  getAuthSessionState: vi.fn(() => ({ refreshToken: 'refresh-token' })),
}))

import * as authApi from '@/features/auth/api/authApi'
import { useLogin, useLogout, useRefreshSession } from '@/features/auth/hooks/useAuth'
import { useProfile } from '@/features/auth/hooks/useProfile'

const mockLogin = vi.spyOn(authApi, 'login')
const mockRefreshToken = vi.spyOn(authApi, 'refreshToken')
const mockLogout = vi.spyOn(authApi, 'logout')
const mockGetProfile = vi.spyOn(authApi, 'getProfile')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useLogin', () => {
  it('calls login API and sets session on success', async () => {
    const tokens = { accessToken: 'at', refreshToken: 'rt', tokenType: 'Bearer' as const, role: 'ADMIN' as const, userId: 'u-1', username: 'admin' }
    mockLogin.mockResolvedValue(tokens)

    const { result } = renderHook(() => useLogin(), { wrapper: createAllProviders() })
    result.current.mutate({ username: 'admin', password: 'pass' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockLogin).toHaveBeenCalledWith({ username: 'admin', password: 'pass' }, expect.anything())
  })
})

describe('useRefreshSession', () => {
  it('calls refreshToken API and sets session on success', async () => {
    const tokens = { accessToken: 'new-at', refreshToken: 'new-rt', tokenType: 'Bearer' as const, role: 'ADMIN' as const, userId: 'u-1', username: 'admin' }
    mockRefreshToken.mockResolvedValue(tokens)

    const { result } = renderHook(() => useRefreshSession(), { wrapper: createAllProviders() })
    result.current.mutate({ refreshToken: 'old-rt' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockRefreshToken).toHaveBeenCalledWith({ refreshToken: 'old-rt' }, expect.anything())
  })
})

describe('useLogout', () => {
  it('calls logout API with refresh token and clears session', async () => {
    mockLogout.mockResolvedValue(undefined)

    const { result } = renderHook(() => useLogout(), { wrapper: createAllProviders() })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockLogout).toHaveBeenCalledWith({ refreshToken: 'refresh-token' })
  })
})

describe('useProfile', () => {
  it('fetches profile from auth/me', async () => {
    const profile = { id: 'u-1', username: 'admin', email: 'a@b.com', role: 'ADMIN' as const, active: true, doctorId: null, doctorFirstName: null, doctorLastName: null }
    mockGetProfile.mockResolvedValue(profile)

    const { result } = renderHook(() => useProfile(), { wrapper: createAllProviders() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockGetProfile).toHaveBeenCalledTimes(1)
    expect(result.current.data?.username).toBe('admin')
  })
})
