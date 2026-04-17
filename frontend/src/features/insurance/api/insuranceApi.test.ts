import { describe, expect, it } from 'vitest'
import { ProviderFormSchema, PolicyFormSchema } from '@/features/insurance/api/insuranceApi'

const validProvider = {
  name: 'Seguros ABC',
  code: 'ABC-001',
  phone: '555-1111',
  isActive: true,
}

describe('ProviderFormSchema', () => {
  it('accepts valid provider with required fields only', () => {
    const result = ProviderFormSchema.safeParse(validProvider)
    expect(result.success).toBe(true)
  })

  it('accepts valid provider with optional fields', () => {
    const result = ProviderFormSchema.safeParse({
      ...validProvider,
      email: 'info@abc.com',
      address: 'Av. Principal 123',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty string as email', () => {
    const result = ProviderFormSchema.safeParse({ ...validProvider, email: '' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = ProviderFormSchema.safeParse({ ...validProvider, email: 'bad-email' })
    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    const result = ProviderFormSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.issues.map((i) => String(i.path[0]))
      expect(fields).toContain('name')
      expect(fields).toContain('code')
      expect(fields).toContain('phone')
      expect(fields).toContain('isActive')
    }
  })
})

const validPolicy = {
  patientId: 'patient-1',
  providerId: 'provider-1',
  policyNumber: 'POL-2025-001',
  coveragePercentage: 80,
  deductible: 500,
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  isActive: true,
}

describe('PolicyFormSchema', () => {
  it('accepts valid policy data', () => {
    const result = PolicyFormSchema.safeParse(validPolicy)
    expect(result.success).toBe(true)
  })

  it('rejects endDate before startDate', () => {
    const result = PolicyFormSchema.safeParse({
      ...validPolicy,
      startDate: '2025-06-01',
      endDate: '2025-01-01',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('fecha de fin')
    }
  })

  it('accepts startDate equal to endDate', () => {
    const result = PolicyFormSchema.safeParse({
      ...validPolicy,
      startDate: '2025-06-01',
      endDate: '2025-06-01',
    })
    expect(result.success).toBe(true)
  })

  it('rejects coveragePercentage below 0', () => {
    const result = PolicyFormSchema.safeParse({ ...validPolicy, coveragePercentage: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects coveragePercentage above 100', () => {
    const result = PolicyFormSchema.safeParse({ ...validPolicy, coveragePercentage: 101 })
    expect(result.success).toBe(false)
  })

  it('rejects negative deductible', () => {
    const result = PolicyFormSchema.safeParse({ ...validPolicy, deductible: -100 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid date format', () => {
    const result = PolicyFormSchema.safeParse({
      ...validPolicy,
      startDate: '01/01/2025',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const dateError = result.error.issues.find((i) => i.path[0] === 'startDate')
      expect(dateError?.message).toContain('Formato invalido')
    }
  })

  it('rejects missing required fields', () => {
    const result = PolicyFormSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.issues.map((i) => String(i.path[0]))
      expect(fields).toContain('patientId')
      expect(fields).toContain('providerId')
      expect(fields).toContain('policyNumber')
      expect(fields).toContain('coveragePercentage')
      expect(fields).toContain('deductible')
      expect(fields).toContain('startDate')
      expect(fields).toContain('endDate')
    }
  })
})
