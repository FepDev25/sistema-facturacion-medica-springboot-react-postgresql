import { describe, expect, it } from 'vitest'
import {
  CompleteAppointmentFormSchema,
  DiagnosisFormSchema,
  PrescriptionFormSchema,
  ProcedureFormSchema,
} from '@/features/medical-records/api/medicalRecordsApi'

describe('CompleteAppointmentFormSchema', () => {
  const validData = {
    clinicalNotes: 'Paciente con dolor abdominal agudo.',
  }

  it('accepts valid data with required fields only', () => {
    const result = CompleteAppointmentFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('accepts valid data with all vital signs', () => {
    const result = CompleteAppointmentFormSchema.safeParse({
      ...validData,
      physicalExam: 'Abdomen blando, no doloroso',
      bloodPressure: '120/80',
      heartRate: 72,
      temperature: 36.5,
      oxygenSaturation: 98,
      weight: 70,
      height: 170,
      glucose: 95,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty clinicalNotes', () => {
    const result = CompleteAppointmentFormSchema.safeParse({ clinicalNotes: '' })
    expect(result.success).toBe(false)
  })

  it('rejects clinicalNotes exceeding max length', () => {
    const result = CompleteAppointmentFormSchema.safeParse({
      clinicalNotes: 'a'.repeat(2001),
    })
    expect(result.success).toBe(false)
  })

  it('rejects heartRate below minimum', () => {
    const result = CompleteAppointmentFormSchema.safeParse({
      ...validData,
      heartRate: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects heartRate above maximum', () => {
    const result = CompleteAppointmentFormSchema.safeParse({
      ...validData,
      heartRate: 301,
    })
    expect(result.success).toBe(false)
  })

  it('rejects temperature below minimum', () => {
    const result = CompleteAppointmentFormSchema.safeParse({
      ...validData,
      temperature: 29,
    })
    expect(result.success).toBe(false)
  })

  it('rejects temperature above maximum', () => {
    const result = CompleteAppointmentFormSchema.safeParse({
      ...validData,
      temperature: 46,
    })
    expect(result.success).toBe(false)
  })

  it('rejects oxygenSaturation above 100', () => {
    const result = CompleteAppointmentFormSchema.safeParse({
      ...validData,
      oxygenSaturation: 101,
    })
    expect(result.success).toBe(false)
  })
})

describe('DiagnosisFormSchema', () => {
  const validData = {
    icd10Code: 'J06.9',
    description: 'Infeccion aguda de vias respiratorias superiores',
    diagnosedAt: '2025-06-15',
  }

  it('accepts valid diagnosis with required fields', () => {
    const result = DiagnosisFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('accepts valid diagnosis with optional severity', () => {
    const severities = ['mild', 'moderate', 'severe', 'critical'] as const
    for (const sev of severities) {
      const result = DiagnosisFormSchema.safeParse({ ...validData, severity: sev })
      expect(result.success, `Failed for severity: ${sev}`).toBe(true)
    }
  })

  it('accepts valid ICD-10 codes', () => {
    const validCodes = ['A00', 'J06.9', 'E11.9', 'I10', 'K21.0', 'R50.9']
    for (const code of validCodes) {
      const result = DiagnosisFormSchema.safeParse({ ...validData, icd10Code: code })
      expect(result.success, `Failed for code: ${code}`).toBe(true)
    }
  })

  it('rejects invalid ICD-10 code format', () => {
    const invalidCodes = ['123', 'ABC', 'J6', 'J06.99999', 'j06.9']
    for (const code of invalidCodes) {
      const result = DiagnosisFormSchema.safeParse({ ...validData, icd10Code: code })
      expect(result.success, `Should reject code: ${code}`).toBe(false)
    }
  })

  it('rejects empty icd10Code', () => {
    const result = DiagnosisFormSchema.safeParse({ ...validData, icd10Code: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty description', () => {
    const result = DiagnosisFormSchema.safeParse({ ...validData, description: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid severity', () => {
    const result = DiagnosisFormSchema.safeParse({ ...validData, severity: 'terminal' })
    expect(result.success).toBe(false)
  })
})

describe('PrescriptionFormSchema', () => {
  const validData = {
    medicationId: 'med-uuid-1',
    dosage: '400mg',
    frequency: 'Cada 8 horas',
    durationDays: 7,
  }

  it('accepts valid prescription with required fields', () => {
    const result = PrescriptionFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('accepts valid prescription with optional instructions', () => {
    const result = PrescriptionFormSchema.safeParse({
      ...validData,
      instructions: 'Tomar con alimentos',
    })
    expect(result.success).toBe(true)
  })

  it('rejects durationDays below minimum', () => {
    const result = PrescriptionFormSchema.safeParse({ ...validData, durationDays: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects durationDays above maximum', () => {
    const result = PrescriptionFormSchema.safeParse({ ...validData, durationDays: 366 })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer durationDays', () => {
    const result = PrescriptionFormSchema.safeParse({ ...validData, durationDays: 7.5 })
    expect(result.success).toBe(false)
  })

  it('rejects empty dosage', () => {
    const result = PrescriptionFormSchema.safeParse({ ...validData, dosage: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty frequency', () => {
    const result = PrescriptionFormSchema.safeParse({ ...validData, frequency: '' })
    expect(result.success).toBe(false)
  })
})

describe('ProcedureFormSchema', () => {
  const validData = {
    procedureCode: 'PROC-001',
    description: 'Extraccion de sangre venosa',
    performedAt: '2025-06-15T10:30:00',
  }

  it('accepts valid procedure with required fields', () => {
    const result = ProcedureFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('accepts valid procedure with optional notes', () => {
    const result = ProcedureFormSchema.safeParse({
      ...validData,
      notes: 'Sin complicaciones',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty procedureCode', () => {
    const result = ProcedureFormSchema.safeParse({ ...validData, procedureCode: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty description', () => {
    const result = ProcedureFormSchema.safeParse({ ...validData, description: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty performedAt', () => {
    const result = ProcedureFormSchema.safeParse({ ...validData, performedAt: '' })
    expect(result.success).toBe(false)
  })

  it('rejects procedureCode exceeding max length', () => {
    const result = ProcedureFormSchema.safeParse({
      ...validData,
      procedureCode: 'a'.repeat(51),
    })
    expect(result.success).toBe(false)
  })
})
