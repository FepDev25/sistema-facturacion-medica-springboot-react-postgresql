import { describe, expect, it, vi } from 'vitest'
import { getPolicyColumns } from '@/features/insurance/components/policyColumns'

describe('getPolicyColumns', () => {
  const opts = { onEdit: vi.fn(), canManage: true }

  it('returns 8 columns', () => {
    expect(getPolicyColumns(opts)).toHaveLength(8)
  })

  it('has correct accessorKey columns', () => {
    const cols = getPolicyColumns(opts)
    expect(cols.filter((c) => 'accessorKey' in c).map((c) => (c as { accessorKey: string }).accessorKey)).toEqual([
      'policyNumber',
      'coveragePercentage',
      'deductible',
      'isActive',
    ])
  })

  it('has correct id columns', () => {
    const cols = getPolicyColumns(opts)
    expect(cols.filter((c) => 'id' in c).map((c) => c.id)).toEqual(['patient', 'provider', 'validity', 'actions'])
  })

  it('defines correct headers', () => {
    const cols = getPolicyColumns(opts)
    expect(cols[0].header).toBe('Poliza')
    expect(cols[1].header).toBe('Paciente')
    expect(cols[2].header).toBe('Aseguradora')
    expect(cols[6].header).toBe('Estado')
  })

  it('defines size on columns', () => {
    const cols = getPolicyColumns(opts)
    expect(cols[0].size).toBe(150)
    expect(cols[3].size).toBe(110)
    expect(cols[4].size).toBe(120)
    expect(cols[7].size).toBe(60)
  })
})
