import { describe, expect, it, vi } from 'vitest'
import { getProviderColumns } from '@/features/insurance/components/providerColumns'

describe('getProviderColumns', () => {
  const opts = { onEdit: vi.fn(), onDeactivate: vi.fn(), canManage: true }

  it('returns 5 columns', () => {
    expect(getProviderColumns(opts)).toHaveLength(5)
  })

  it('has correct accessorKey columns', () => {
    const cols = getProviderColumns(opts)
    expect(cols.filter((c) => 'accessorKey' in c).map((c) => (c as { accessorKey: string }).accessorKey)).toEqual([
      'code',
      'name',
      'phone',
      'isActive',
    ])
  })

  it('has correct id columns', () => {
    const cols = getProviderColumns(opts)
    expect(cols.filter((c) => 'id' in c).map((c) => c.id)).toEqual(['actions'])
  })

  it('defines correct headers', () => {
    const cols = getProviderColumns(opts)
    expect(cols[0].header).toBe('Codigo')
    expect(cols[1].header).toBe('Aseguradora')
    expect(cols[2].header).toBe('Telefono')
    expect(cols[3].header).toBe('Estado')
  })

  it('defines size on columns', () => {
    const cols = getProviderColumns(opts)
    expect(cols[0].size).toBe(120)
    expect(cols[2].size).toBe(160)
    expect(cols[3].size).toBe(100)
    expect(cols[4].size).toBe(90)
  })
})
