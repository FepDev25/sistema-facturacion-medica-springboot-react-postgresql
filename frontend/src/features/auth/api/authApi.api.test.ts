import { beforeEach, describe, expect, it, vi } from 'vitest'
import { login, logout, refreshToken, getProfile } from '@/features/auth/api/authApi'
import type { TokenResponse, UserProfileResponse } from '@/features/auth/api/authApi'

vi.mock('@/lib/axios', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: { headers: { common: {} } },
  },
}))

import { apiClient as mockedClient } from '@/lib/axios'

const mockPost = vi.mocked(mockedClient.post)
const mockGet = vi.mocked(mockedClient.get)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('auth API', () => {
  const mockToken: TokenResponse = {
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-456',
    tokenType: 'Bearer',
    role: 'ADMIN',
    userId: 'user-1',
    username: 'admin',
  }

  const mockProfile: UserProfileResponse = {
    id: 'user-1',
    username: 'admin',
    email: 'admin@clinic.com',
    role: 'ADMIN',
    active: true,
    doctorId: null,
    doctorFirstName: null,
    doctorLastName: null,
  }

  describe('login', () => {
    it('posts to /auth/login and returns token', async () => {
      mockPost.mockResolvedValue({ data: mockToken })
      const result = await login({ username: 'admin', password: 'pass' })
      expect(mockPost).toHaveBeenCalledWith('/auth/login', { username: 'admin', password: 'pass' })
      expect(result).toEqual(mockToken)
    })
  })

  describe('refreshToken', () => {
    it('posts to /auth/refresh and returns token', async () => {
      mockPost.mockResolvedValue({ data: mockToken })
      const result = await refreshToken({ refreshToken: 'old-refresh' })
      expect(mockPost).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'old-refresh' })
      expect(result).toEqual(mockToken)
    })
  })

  describe('logout', () => {
    it('posts to /auth/logout', async () => {
      mockPost.mockResolvedValue({ data: undefined })
      await logout({ refreshToken: 'token-to-revoke' })
      expect(mockPost).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'token-to-revoke' })
    })
  })

  describe('getProfile', () => {
    it('gets /auth/me and returns profile', async () => {
      mockGet.mockResolvedValue({ data: mockProfile })
      const result = await getProfile()
      expect(mockGet).toHaveBeenCalledWith('/auth/me')
      expect(result).toEqual(mockProfile)
    })

    it('returns profile with doctor link when doctorId present', async () => {
      const doctorProfile: UserProfileResponse = {
        ...mockProfile,
        role: 'DOCTOR',
        doctorId: 'doc-1',
        doctorFirstName: 'Maria',
        doctorLastName: 'Garcia',
      }
      mockGet.mockResolvedValue({ data: doctorProfile })
      const result = await getProfile()
      expect(result.doctorId).toBe('doc-1')
      expect(result.doctorFirstName).toBe('Maria')
    })
  })
})
