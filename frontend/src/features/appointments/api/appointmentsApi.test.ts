import { describe, expect, it } from 'vitest'
import { AppointmentFormSchema } from '@/features/appointments/api/appointmentsApi'

const validData = {
  patientId: 'patient-uuid-1',
  doctorId: 'doctor-uuid-1',
  scheduledAt: '2025-06-20T10:00:00',
  durationMinutes: 30,
}

describe('AppointmentFormSchema', () => {
  it('accepts valid appointment with required fields only', () => {
    const result = AppointmentFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('accepts valid appointment with optional chiefComplaint and notes', () => {
    const result = AppointmentFormSchema.safeParse({
      ...validData,
      chiefComplaint: 'Dolor de cabeza',
      notes: 'Paciente refiere dolor desde hace 3 dias',
    })
    expect(result.success).toBe(true)
  })

  it('chiefComplaint is optional', () => {
    const result = AppointmentFormSchema.safeParse({ ...validData, chiefComplaint: undefined })
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const result = AppointmentFormSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.issues.map((i) => String(i.path[0]))
      expect(fields).toContain('patientId')
      expect(fields).toContain('doctorId')
      expect(fields).toContain('scheduledAt')
      expect(fields).toContain('durationMinutes')
    }
  })

  it('rejects durationMinutes below minimum', () => {
    const result = AppointmentFormSchema.safeParse({ ...validData, durationMinutes: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects durationMinutes above maximum', () => {
    const result = AppointmentFormSchema.safeParse({ ...validData, durationMinutes: 241 })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer durationMinutes', () => {
    const result = AppointmentFormSchema.safeParse({ ...validData, durationMinutes: 30.5 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const durError = result.error.issues.find((i) => i.path[0] === 'durationMinutes')
      expect(durError?.message).toContain('entero')
    }
  })

  it('rejects non-number durationMinutes', () => {
    const result = AppointmentFormSchema.safeParse({ ...validData, durationMinutes: '30' as unknown as number })
    expect(result.success).toBe(false)
  })

  it('rejects chiefComplaint exceeding max length', () => {
    const result = AppointmentFormSchema.safeParse({
      ...validData,
      chiefComplaint: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it('rejects notes exceeding max length', () => {
    const result = AppointmentFormSchema.safeParse({
      ...validData,
      notes: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })
})
