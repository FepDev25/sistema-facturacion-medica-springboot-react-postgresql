import { describe, expect, it } from 'vitest'
import { getPatientMedicalRecordColumns } from '@/features/patients/components/patientMedicalRecordColumns'

describe('getPatientMedicalRecordColumns', () => {
  it('returns 3 columns', () => {
    expect(getPatientMedicalRecordColumns()).toHaveLength(3)
  })

  it('has correct accessorKey columns', () => {
    const cols = getPatientMedicalRecordColumns()
    expect(cols.filter((c) => 'accessorKey' in c).map((c) => (c as { accessorKey: string }).accessorKey)).toEqual([
      'recordDate',
      'clinicalNotes',
    ])
  })

  it('has correct id columns', () => {
    const cols = getPatientMedicalRecordColumns()
    expect(cols.filter((c) => 'id' in c).map((c) => c.id)).toEqual(['actions'])
  })

  it('defines correct headers', () => {
    const cols = getPatientMedicalRecordColumns()
    expect(cols[0].header).toBe('Fecha de registro')
    expect(cols[1].header).toBe('Notas clínicas')
  })

  it('defines size on columns', () => {
    const cols = getPatientMedicalRecordColumns()
    expect(cols[0].size).toBe(180)
    expect(cols[2].size).toBe(60)
  })
})
