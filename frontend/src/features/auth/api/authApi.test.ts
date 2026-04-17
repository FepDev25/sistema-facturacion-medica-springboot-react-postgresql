import { describe, expect, it } from 'vitest'
import { LoginFormSchema } from '@/features/auth/api/authApi'

describe('LoginFormSchema', () => {
  const validData = { username: 'admin', password: 'secret123' }

  it('accepts valid login credentials', () => {
    const result = LoginFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects empty username', () => {
    const result = LoginFormSchema.safeParse({ ...validData, username: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const usernameError = result.error.issues.find((i) => i.path[0] === 'username')
      expect(usernameError?.message).toBe('Requerido')
    }
  })

  it('rejects empty password', () => {
    const result = LoginFormSchema.safeParse({ ...validData, password: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const passwordError = result.error.issues.find((i) => i.path[0] === 'password')
      expect(passwordError?.message).toBe('Requerido')
    }
  })

  it('rejects missing fields', () => {
    const result = LoginFormSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toHaveLength(2)
    }
  })
})
