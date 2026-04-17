import { describe, expect, it } from 'vitest'
import { PatientFormSchema } from '@/features/patients/api/patientsApi'

const validData = {
  dni: '12345678',
  firstName: 'Juan',
  lastName: 'Perez',
  birthDate: '1990-05-15',
  gender: 'male' as const,
  phone: '555-1234',
}

describe('PatientFormSchema', () => {
  it('accepts valid patient data with required fields only', () => {
    const result = PatientFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('accepts valid patient data with all optional fields', () => {
    const result = PatientFormSchema.safeParse({
      ...validData,
      email: 'juan@test.com',
      address: 'Calle 123',
      bloodType: 'O+',
      allergies: 'Penicilina',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty string as valid email (treated as no email)', () => {
    const result = PatientFormSchema.safeParse({ ...validData, email: '' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email format', () => {
    const result = PatientFormSchema.safeParse({ ...validData, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    const result = PatientFormSchema.safeParse({ dni: '123' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fieldNames = result.error.issues.map((i) => String(i.path[0]))
      expect(fieldNames).toContain('firstName')
      expect(fieldNames).toContain('lastName')
      expect(fieldNames).toContain('birthDate')
      expect(fieldNames).toContain('gender')
      expect(fieldNames).toContain('phone')
    }
  })

  it('rejects invalid birthDate format', () => {
    const result = PatientFormSchema.safeParse({ ...validData, birthDate: '15/05/1990' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const birthError = result.error.issues.find((i) => i.path[0] === 'birthDate')
      expect(birthError?.message).toContain('Formato inválido')
    }
  })

  it('rejects invalid gender value', () => {
    const result = PatientFormSchema.safeParse({ ...validData, gender: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('rejects dni exceeding max length', () => {
    const result = PatientFormSchema.safeParse({ ...validData, dni: 'a'.repeat(21) })
    expect(result.success).toBe(false)
    if (!result.success) {
      const dniError = result.error.issues.find((i) => i.path[0] === 'dni')
      expect(dniError?.message).toContain('Máximo 20 caracteres')
    }
  })

  it('rejects firstName exceeding max length', () => {
    const result = PatientFormSchema.safeParse({ ...validData, firstName: 'a'.repeat(101) })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameError = result.error.issues.find((i) => i.path[0] === 'firstName')
      expect(nameError?.message).toContain('Máximo 100 caracteres')
    }
  })

  it('rejects address exceeding max length', () => {
    const result = PatientFormSchema.safeParse({ ...validData, address: 'a'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('rejects bloodType exceeding max length', () => {
    const result = PatientFormSchema.safeParse({ ...validData, bloodType: 'ABCDEF' })
    expect(result.success).toBe(false)
  })

  it('rejects allergies exceeding max length', () => {
    const result = PatientFormSchema.safeParse({ ...validData, allergies: 'a'.repeat(501) })
    expect(result.success).toBe(false)
  })
})
