import { describe, expect, it } from 'vitest'
import {
  PaymentFormSchema,
  InvoiceItemFormSchema,
} from '@/features/invoices/api/invoicesApi'

const validPayment = {
  amount: 1000,
  paymentMethod: 'cash' as const,
  paymentDate: '2025-06-15',
}

describe('PaymentFormSchema', () => {
  it('accepts valid payment with required fields only', () => {
    const result = PaymentFormSchema.safeParse(validPayment)
    expect(result.success).toBe(true)
  })

  it('accepts valid payment with optional fields', () => {
    const result = PaymentFormSchema.safeParse({
      ...validPayment,
      referenceNumber: 'REF-001',
      notes: 'Pago parcial',
    })
    expect(result.success).toBe(true)
  })

  it('accepts all payment methods', () => {
    const methods = ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'insurance', 'other'] as const
    for (const method of methods) {
      const result = PaymentFormSchema.safeParse({ ...validPayment, paymentMethod: method })
      expect(result.success, `Failed for method: ${method}`).toBe(true)
    }
  })

  it('rejects zero amount', () => {
    const result = PaymentFormSchema.safeParse({ ...validPayment, amount: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative amount', () => {
    const result = PaymentFormSchema.safeParse({ ...validPayment, amount: -100 })
    expect(result.success).toBe(false)
  })

  it('rejects non-number amount', () => {
    const result = PaymentFormSchema.safeParse({ ...validPayment, amount: 'free' as unknown as number })
    expect(result.success).toBe(false)
  })

  it('rejects invalid payment method', () => {
    const result = PaymentFormSchema.safeParse({ ...validPayment, paymentMethod: 'crypto' })
    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    const result = PaymentFormSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.issues.map((i) => String(i.path[0]))
      expect(fields).toContain('amount')
      expect(fields).toContain('paymentMethod')
      expect(fields).toContain('paymentDate')
    }
  })
})

const validItem = {
  itemType: 'procedure' as const,
  description: 'Examen de sangre completo',
  quantity: 1,
  unitPrice: 800,
}

describe('InvoiceItemFormSchema', () => {
  it('accepts valid procedure item', () => {
    const result = InvoiceItemFormSchema.safeParse(validItem)
    expect(result.success).toBe(true)
  })

  it('accepts valid service item with serviceId', () => {
    const result = InvoiceItemFormSchema.safeParse({
      ...validItem,
      itemType: 'service',
      serviceId: 'svc-uuid-1',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid medication item with medicationId', () => {
    const result = InvoiceItemFormSchema.safeParse({
      ...validItem,
      itemType: 'medication',
      medicationId: 'med-uuid-1',
    })
    expect(result.success).toBe(true)
  })

  it('rejects service item without serviceId', () => {
    const result = InvoiceItemFormSchema.safeParse({
      ...validItem,
      itemType: 'service',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const serviceError = result.error.issues.find((i) => i.path[0] === 'serviceId')
      expect(serviceError?.message).toContain('servicio')
    }
  })

  it('rejects medication item without medicationId', () => {
    const result = InvoiceItemFormSchema.safeParse({
      ...validItem,
      itemType: 'medication',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const medError = result.error.issues.find((i) => i.path[0] === 'medicationId')
      expect(medError?.message).toContain('medicamento')
    }
  })

  it('accepts all item types', () => {
    const types = ['service', 'medication', 'procedure', 'other'] as const
    for (const type of types) {
      const data = {
        ...validItem,
        itemType: type,
        ...(type === 'service' ? { serviceId: 'id' } : {}),
        ...(type === 'medication' ? { medicationId: 'id' } : {}),
      }
      const result = InvoiceItemFormSchema.safeParse(data)
      expect(result.success, `Failed for type: ${type}`).toBe(true)
    }
  })

  it('rejects zero quantity', () => {
    const result = InvoiceItemFormSchema.safeParse({ ...validItem, quantity: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative quantity', () => {
    const result = InvoiceItemFormSchema.safeParse({ ...validItem, quantity: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer quantity', () => {
    const result = InvoiceItemFormSchema.safeParse({ ...validItem, quantity: 1.5 })
    expect(result.success).toBe(false)
  })

  it('rejects zero unitPrice', () => {
    const result = InvoiceItemFormSchema.safeParse({ ...validItem, unitPrice: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative unitPrice', () => {
    const result = InvoiceItemFormSchema.safeParse({ ...validItem, unitPrice: -50 })
    expect(result.success).toBe(false)
  })

  it('rejects empty description', () => {
    const result = InvoiceItemFormSchema.safeParse({ ...validItem, description: '' })
    expect(result.success).toBe(false)
  })

  it('rejects description exceeding max length', () => {
    const result = InvoiceItemFormSchema.safeParse({ ...validItem, description: 'a'.repeat(256) })
    expect(result.success).toBe(false)
  })
})
