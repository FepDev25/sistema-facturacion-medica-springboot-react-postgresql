import { describe, expect, it } from 'vitest'
import { DoctorFormSchema } from '@/features/doctors/api/doctorsApi'

const validData = {
  licenseNumber: 'MED-12345',
  firstName: 'Maria',
  lastName: 'Garcia',
  specialty: 'Cardiologia',
  phone: '555-9876',
  email: 'maria@test.com',
  isActive: true,
}

describe('DoctorFormSchema', () => {
  it('accepts valid doctor data without userId', () => {
    const result = DoctorFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('accepts valid doctor data with userId', () => {
    const result = DoctorFormSchema.safeParse({ ...validData, userId: 'user-uuid-123' })
    expect(result.success).toBe(true)
  })

  it('accepts null userId', () => {
    const result = DoctorFormSchema.safeParse({ ...validData, userId: null })
    expect(result.success).toBe(true)
  })

  it('rejects empty required fields', () => {
    const result = DoctorFormSchema.safeParse({
      licenseNumber: '',
      firstName: '',
      lastName: '',
      specialty: '',
      phone: '',
      email: '',
      isActive: true,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(6)
    }
  })

  it('rejects invalid email', () => {
    const result = DoctorFormSchema.safeParse({ ...validData, email: 'not-email' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.issues.find((i) => i.path[0] === 'email')
      expect(emailError?.message).toContain('Email inválido')
    }
  })

  it('rejects licenseNumber exceeding max length', () => {
    const result = DoctorFormSchema.safeParse({ ...validData, licenseNumber: 'a'.repeat(51) })
    expect(result.success).toBe(false)
    if (!result.success) {
      const licError = result.error.issues.find((i) => i.path[0] === 'licenseNumber')
      expect(licError?.message).toContain('Máximo 50 caracteres')
    }
  })

  it('rejects email exceeding max length', () => {
    const result = DoctorFormSchema.safeParse({
      ...validData,
      email: `${'a'.repeat(92)}@test.com`,
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing isActive', () => {
    const { isActive, ...withoutActive } = validData
    const result = DoctorFormSchema.safeParse(withoutActive)
    expect(result.success).toBe(false)
  })
})
