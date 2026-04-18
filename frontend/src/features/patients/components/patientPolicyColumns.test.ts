import { describe, expect, it } from 'vitest'
import { getPatientPolicyColumns } from '@/features/patients/components/patientPolicyColumns'

describe('getPatientPolicyColumns', () => {
  it('returns 4 columns', () => {
    expect(getPatientPolicyColumns()).toHaveLength(4)
  })

  it('has correct accessorKey columns', () => {
    const cols = getPatientPolicyColumns()
    expect(cols.filter((c) => 'accessorKey' in c).map((c) => (c as { accessorKey: string }).accessorKey)).toEqual([
      'policyNumber',
      'providerName',
      'coveragePercentage',
    ])
  })

  it('has correct id columns', () => {
    const cols = getPatientPolicyColumns()
    expect(cols.filter((c) => 'id' in c).map((c) => c.id)).toEqual(['actions'])
  })

  it('defines correct headers', () => {
    const cols = getPatientPolicyColumns()
    expect(cols[0].header).toBe('Póliza')
    expect(cols[1].header).toBe('Aseguradora')
  })

  it('defines size on columns', () => {
    const cols = getPatientPolicyColumns()
    expect(cols[0].size).toBe(180)
    expect(cols[2].size).toBe(120)
    expect(cols[3].size).toBe(60)
  })
})
