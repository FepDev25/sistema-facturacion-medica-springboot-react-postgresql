import { describe, expect, it, vi } from 'vitest'
import { getPatientColumns } from '@/features/patients/components/patientColumns'

describe('getPatientColumns', () => {
  const opts = { onEdit: vi.fn(), canEdit: true }

  it('returns 4 columns', () => {
    expect(getPatientColumns(opts)).toHaveLength(4)
  })

  it('has correct accessorKey columns', () => {
    const cols = getPatientColumns(opts)
    const accessorCols = cols.filter((c) => 'accessorKey' in c)
    expect(accessorCols.map((c) => (c as { accessorKey: string }).accessorKey)).toEqual(['dni', 'phone'])
  })

  it('has correct id columns', () => {
    const cols = getPatientColumns(opts)
    expect(cols.filter((c) => 'id' in c).map((c) => c.id)).toEqual(['fullName', 'actions'])
  })

  it('defines correct headers', () => {
    const cols = getPatientColumns(opts)
    expect(cols[0].header).toBe('DNI')
    expect(cols[1].header).toBe('Nombre completo')
    expect(cols[2].header).toBe('Teléfono')
  })

  it('defines size on columns', () => {
    const cols = getPatientColumns(opts)
    expect(cols[0].size).toBe(140)
    expect(cols[2].size).toBe(180)
    expect(cols[3].size).toBe(100)
  })
})
