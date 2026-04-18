import { describe, expect, it, beforeEach } from 'vitest'
import {
  setAuthSession,
  clearAuthSession,
  getAccessToken,
  isAuthenticated,
  hasRole,
  hasAnyRole,
  getAuthSessionState,
  subscribeAuthSession,
} from '@/features/auth/store/authSessionStore'
import type { TokenResponse } from '@/features/auth/api/authApi'

const adminTokens: TokenResponse = {
  accessToken: 'access-123',
  refreshToken: 'refresh-456',
  tokenType: 'Bearer',
  role: 'ADMIN',
  userId: 'user-1',
  username: 'admin',
}

const doctorTokens: TokenResponse = {
  accessToken: 'access-doc',
  refreshToken: null,
  tokenType: 'Bearer',
  role: 'DOCTOR',
  userId: 'user-2',
  username: 'drhouse',
}

beforeEach(() => {
  clearAuthSession()
})

describe('authSessionStore', () => {
  describe('initial state', () => {
    it('starts unauthenticated with all null values', () => {
      const state = getAuthSessionState()
      expect(state.accessToken).toBeNull()
      expect(state.refreshToken).toBeNull()
      expect(state.role).toBeNull()
      expect(state.userId).toBeNull()
      expect(state.username).toBeNull()
    })

    it('isAuthenticated returns false initially', () => {
      expect(isAuthenticated()).toBe(false)
    })

    it('getAccessToken returns null initially', () => {
      expect(getAccessToken()).toBeNull()
    })

    it('hasRole returns false for any role initially', () => {
      expect(hasRole('ADMIN')).toBe(false)
      expect(hasRole('DOCTOR')).toBe(false)
      expect(hasRole('RECEPTIONIST')).toBe(false)
    })

    it('hasAnyRole returns false initially', () => {
      expect(hasAnyRole(['ADMIN', 'DOCTOR'])).toBe(false)
    })
  })

  describe('setAuthSession', () => {
    it('stores all token fields', () => {
      setAuthSession(adminTokens)
      const state = getAuthSessionState()
      expect(state.accessToken).toBe('access-123')
      expect(state.refreshToken).toBe('refresh-456')
      expect(state.role).toBe('ADMIN')
      expect(state.userId).toBe('user-1')
      expect(state.username).toBe('admin')
    })

    it('handles null refreshToken', () => {
      setAuthSession(doctorTokens)
      const state = getAuthSessionState()
      expect(state.refreshToken).toBeNull()
    })

    it('makes isAuthenticated return true', () => {
      setAuthSession(adminTokens)
      expect(isAuthenticated()).toBe(true)
    })

    it('makes getAccessToken return the token', () => {
      setAuthSession(adminTokens)
      expect(getAccessToken()).toBe('access-123')
    })
  })

  describe('clearAuthSession', () => {
    it('resets all fields to null', () => {
      setAuthSession(adminTokens)
      clearAuthSession()
      const state = getAuthSessionState()
      expect(state.accessToken).toBeNull()
      expect(state.refreshToken).toBeNull()
      expect(state.role).toBeNull()
      expect(state.userId).toBeNull()
      expect(state.username).toBeNull()
    })

    it('makes isAuthenticated return false', () => {
      setAuthSession(adminTokens)
      clearAuthSession()
      expect(isAuthenticated()).toBe(false)
    })
  })

  describe('hasRole', () => {
    it('returns true when role matches', () => {
      setAuthSession(adminTokens)
      expect(hasRole('ADMIN')).toBe(true)
    })

    it('returns false when role does not match', () => {
      setAuthSession(adminTokens)
      expect(hasRole('DOCTOR')).toBe(false)
    })
  })

  describe('hasAnyRole', () => {
    it('returns true when current role is in the list', () => {
      setAuthSession(adminTokens)
      expect(hasAnyRole(['ADMIN', 'DOCTOR'])).toBe(true)
    })

    it('returns false when current role is not in the list', () => {
      setAuthSession(adminTokens)
      expect(hasAnyRole(['DOCTOR', 'RECEPTIONIST'])).toBe(false)
    })

    it('returns true with single-element array matching', () => {
      setAuthSession(doctorTokens)
      expect(hasAnyRole(['DOCTOR'])).toBe(true)
    })

    it('returns false with empty array', () => {
      setAuthSession(adminTokens)
      expect(hasAnyRole([])).toBe(false)
    })
  })

  describe('subscribeAuthSession', () => {
    it('notifies listener on setAuthSession', () => {
      const listener = vi.fn()
      const unsubscribe = subscribeAuthSession(listener)
      setAuthSession(adminTokens)
      expect(listener).toHaveBeenCalledOnce()
      unsubscribe()
    })

    it('notifies listener on clearAuthSession', () => {
      setAuthSession(adminTokens)
      const listener = vi.fn()
      const unsubscribe = subscribeAuthSession(listener)
      clearAuthSession()
      expect(listener).toHaveBeenCalledOnce()
      unsubscribe()
    })

    it('stops notifying after unsubscribe', () => {
      const listener = vi.fn()
      const unsubscribe = subscribeAuthSession(listener)
      unsubscribe()
      setAuthSession(adminTokens)
      expect(listener).not.toHaveBeenCalled()
    })

    it('supports multiple listeners', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const unsub1 = subscribeAuthSession(listener1)
      subscribeAuthSession(listener2)
      setAuthSession(adminTokens)
      expect(listener1).toHaveBeenCalledOnce()
      expect(listener2).toHaveBeenCalledOnce()
      unsub1()
    })
  })
})
