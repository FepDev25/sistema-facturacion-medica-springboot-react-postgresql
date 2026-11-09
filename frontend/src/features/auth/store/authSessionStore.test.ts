import { describe, expect, it, beforeEach } from 'vitest'
import {
  setAuthSession,
  clearAuthSession,
  isAuthenticated,
  hasRole,
  hasAnyRole,
  getAuthSessionState,
  subscribeAuthSession,
} from '@/features/auth/store/authSessionStore'
import type { SessionResponse } from '@/features/auth/api/authApi'

const adminSession: SessionResponse = {
  role: 'ADMIN',
  userId: 'user-1',
  username: 'admin',
}

const doctorSession: SessionResponse = {
  role: 'DOCTOR',
  userId: 'user-2',
  username: 'drhouse',
}

beforeEach(() => {
  clearAuthSession()
  window.localStorage.clear()
})

describe('authSessionStore', () => {
  describe('initial state', () => {
    it('starts unauthenticated with all null values', () => {
      const state = getAuthSessionState()
      expect(state.authenticated).toBe(false)
      expect(state.role).toBeNull()
      expect(state.userId).toBeNull()
      expect(state.username).toBeNull()
    })

    it('isAuthenticated returns false initially', () => {
      expect(isAuthenticated()).toBe(false)
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
    it('stores only non-sensitive session metadata', () => {
      setAuthSession(adminSession)
      const state = getAuthSessionState()
      expect(state.authenticated).toBe(true)
      expect(state.role).toBe('ADMIN')
      expect(state.userId).toBe('user-1')
      expect(state.username).toBe('admin')
      expect(state).not.toHaveProperty('accessToken')
      expect(state).not.toHaveProperty('refreshToken')
    })

    it('makes isAuthenticated return true', () => {
      setAuthSession(adminSession)
      expect(isAuthenticated()).toBe(true)
    })
  })

  describe('clearAuthSession', () => {
    it('resets all fields', () => {
      setAuthSession(adminSession)
      clearAuthSession()
      const state = getAuthSessionState()
      expect(state.authenticated).toBe(false)
      expect(state.role).toBeNull()
      expect(state.userId).toBeNull()
      expect(state.username).toBeNull()
    })

    it('makes isAuthenticated return false', () => {
      setAuthSession(adminSession)
      clearAuthSession()
      expect(isAuthenticated()).toBe(false)
    })
  })

  describe('hasRole', () => {
    it('returns true when role matches', () => {
      setAuthSession(adminSession)
      expect(hasRole('ADMIN')).toBe(true)
    })

    it('returns false when role does not match', () => {
      setAuthSession(adminSession)
      expect(hasRole('DOCTOR')).toBe(false)
    })
  })

  describe('hasAnyRole', () => {
    it('returns true when current role is in the list', () => {
      setAuthSession(adminSession)
      expect(hasAnyRole(['ADMIN', 'DOCTOR'])).toBe(true)
    })

    it('returns false when current role is not in the list', () => {
      setAuthSession(adminSession)
      expect(hasAnyRole(['DOCTOR', 'RECEPTIONIST'])).toBe(false)
    })

    it('returns true with single-element array matching', () => {
      setAuthSession(doctorSession)
      expect(hasAnyRole(['DOCTOR'])).toBe(true)
    })

    it('returns false with empty array', () => {
      setAuthSession(adminSession)
      expect(hasAnyRole([])).toBe(false)
    })
  })

  describe('persistencia de la sesión', () => {
    it('guarda solo metadatos no sensibles en localStorage', () => {
      setAuthSession(adminSession)

      const raw = window.localStorage.getItem('sfm.auth.session.v2')
      expect(raw).not.toBeNull()
      const parsed = JSON.parse(raw!)
      expect(parsed).toMatchObject({
        authenticated: true,
        role: 'ADMIN',
        userId: 'user-1',
        username: 'admin',
      })
      expect(parsed).not.toHaveProperty('accessToken')
      expect(parsed).not.toHaveProperty('refreshToken')
    })

    it('elimina la sesión de localStorage al cerrar sesión', () => {
      setAuthSession(adminSession)
      clearAuthSession()

      expect(window.localStorage.getItem('sfm.auth.session.v2')).toBeNull()
    })

    it('elimina la clave antigua que guardaba tokens en claro', () => {
      window.localStorage.setItem('sfm.auth.session.v1', '{"accessToken":"leaked"}')

      clearAuthSession()

      expect(window.localStorage.getItem('sfm.auth.session.v1')).toBeNull()
    })

    it('rehidrata la sesión al volver a cargar el módulo (F5)', async () => {
      setAuthSession(adminSession)
      vi.resetModules()

      const reloaded = await import('@/features/auth/store/authSessionStore')

      expect(reloaded.isAuthenticated()).toBe(true)
      expect(reloaded.hasRole('ADMIN')).toBe(true)
      expect(reloaded.getAuthSessionState().username).toBe('admin')
    })

    it('ignora y limpia una sesión persistida inválida', async () => {
      window.localStorage.setItem('sfm.auth.session.v2', '{"authenticated":true,"role":"HACKER"}')
      vi.resetModules()

      const reloaded = await import('@/features/auth/store/authSessionStore')

      expect(reloaded.isAuthenticated()).toBe(false)
      expect(window.localStorage.getItem('sfm.auth.session.v2')).toBeNull()
    })

    it('se sincroniza cuando otra pestaña cambia la sesión', () => {
      setAuthSession(adminSession)

      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'sfm.auth.session.v2',
          newValue: JSON.stringify({
            authenticated: true,
            role: 'DOCTOR',
            userId: 'user-2',
            username: 'drhouse',
          }),
        }),
      )

      expect(hasRole('DOCTOR')).toBe(true)
      expect(getAuthSessionState().username).toBe('drhouse')
    })

    it('cierra la sesión cuando otra pestaña la elimina', () => {
      setAuthSession(adminSession)

      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'sfm.auth.session.v2',
          newValue: null,
        }),
      )

      expect(isAuthenticated()).toBe(false)
    })
  })

  describe('subscribeAuthSession', () => {
    it('notifica a los suscriptores cuando cambia la sesión', () => {
      const listener = vi.fn()
      const unsubscribe = subscribeAuthSession(listener)

      setAuthSession(adminSession)
      clearAuthSession()
      unsubscribe()

      expect(listener).toHaveBeenCalledTimes(2)
    })
  })
})
