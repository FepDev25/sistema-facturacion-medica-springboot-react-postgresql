import { describe, expect, it } from 'vitest'
import { ServiceFormSchema, MedicationFormSchema } from '@/features/catalog/api/catalogApi'

const validService = {
  code: 'CONS-001',
  name: 'Consulta General',
  price: 500,
  category: 'consultation' as const,
  isActive: true,
}

describe('ServiceFormSchema', () => {
  it('accepts valid service with required fields only', () => {
    const result = ServiceFormSchema.safeParse(validService)
    expect(result.success).toBe(true)
  })

  it('accepts valid service with optional description', () => {
    const result = ServiceFormSchema.safeParse({
      ...validService,
      description: 'Consulta de medicina general',
    })
    expect(result.success).toBe(true)
  })

  it('accepts all category values', () => {
    const categories = ['consultation', 'laboratory', 'imaging', 'surgery', 'therapy', 'emergency', 'other'] as const
    for (const cat of categories) {
      const result = ServiceFormSchema.safeParse({ ...validService, category: cat })
      expect(result.success, `Failed for category: ${cat}`).toBe(true)
    }
  })

  it('rejects invalid category', () => {
    const result = ServiceFormSchema.safeParse({ ...validService, category: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('rejects negative price', () => {
    const result = ServiceFormSchema.safeParse({ ...validService, price: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects zero price', () => {
    const result = ServiceFormSchema.safeParse({ ...validService, price: 0 })
    expect(result.success).toBe(true)
  })

  it('rejects non-number price', () => {
    const result = ServiceFormSchema.safeParse({ ...validService, price: 'free' as unknown as number })
    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    const result = ServiceFormSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.issues.map((i) => String(i.path[0]))
      expect(fields).toContain('code')
      expect(fields).toContain('name')
      expect(fields).toContain('price')
      expect(fields).toContain('category')
      expect(fields).toContain('isActive')
    }
  })
})

const validMedication = {
  code: 'MED-001',
  name: 'Ibuprofeno 400mg',
  price: 50,
  unit: 'tablet' as const,
  requiresPrescription: true,
  isActive: true,
}

describe('MedicationFormSchema', () => {
  it('accepts valid medication with required fields only', () => {
    const result = MedicationFormSchema.safeParse(validMedication)
    expect(result.success).toBe(true)
  })

  it('accepts all unit values', () => {
    const units = ['tablet', 'capsule', 'ml', 'mg', 'g', 'unit', 'box', 'vial', 'inhaler'] as const
    for (const unit of units) {
      const result = MedicationFormSchema.safeParse({ ...validMedication, unit })
      expect(result.success, `Failed for unit: ${unit}`).toBe(true)
    }
  })

  it('rejects invalid unit', () => {
    const result = MedicationFormSchema.safeParse({ ...validMedication, unit: 'bottle' })
    expect(result.success).toBe(false)
  })

  it('rejects negative price', () => {
    const result = MedicationFormSchema.safeParse({ ...validMedication, price: -10 })
    expect(result.success).toBe(false)
  })

  it('rejects missing requiresPrescription', () => {
    const { requiresPrescription, ...withoutPresc } = validMedication
    const result = MedicationFormSchema.safeParse(withoutPresc)
    expect(result.success).toBe(false)
  })

  it('rejects code exceeding max length', () => {
    const result = MedicationFormSchema.safeParse({ ...validMedication, code: 'a'.repeat(51) })
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding max length', () => {
    const result = MedicationFormSchema.safeParse({ ...validMedication, name: 'a'.repeat(201) })
    expect(result.success).toBe(false)
  })
})
