import { describe, expect, it, vi } from 'vitest'
import { getServiceColumns } from '@/features/catalog/components/serviceColumns'

describe('getServiceColumns', () => {
  const opts = { onEdit: vi.fn(), onToggleActive: vi.fn(), canManage: true }

  it('returns 6 columns', () => {
    expect(getServiceColumns(opts)).toHaveLength(6)
  })

  it('has correct accessorKey columns', () => {
    const cols = getServiceColumns(opts)
    expect(cols.filter((c) => 'accessorKey' in c).map((c) => (c as { accessorKey: string }).accessorKey)).toEqual([
      'code',
      'name',
      'category',
      'price',
      'isActive',
    ])
  })

  it('has correct id columns', () => {
    const cols = getServiceColumns(opts)
    expect(cols.filter((c) => 'id' in c).map((c) => c.id)).toEqual(['actions'])
  })

  it('defines correct headers', () => {
    const cols = getServiceColumns(opts)
    expect(cols[0].header).toBe('Código')
    expect(cols[1].header).toBe('Nombre')
    expect(cols[2].header).toBe('Categoría')
    expect(cols[3].header).toBeDefined()
    expect(cols[4].header).toBe('Estado')
  })

  it('defines size on columns', () => {
    const cols = getServiceColumns(opts)
    expect(cols[0].size).toBe(120)
    expect(cols[2].size).toBe(150)
    expect(cols[4].size).toBe(100)
    expect(cols[5].size).toBe(80)
  })
})
