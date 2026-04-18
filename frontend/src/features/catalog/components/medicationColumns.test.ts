import { describe, expect, it, vi } from 'vitest'
import { getMedicationColumns } from '@/features/catalog/components/medicationColumns'

describe('getMedicationColumns', () => {
  const opts = { onEdit: vi.fn(), onToggleActive: vi.fn(), canManage: true }

  it('returns 7 columns', () => {
    expect(getMedicationColumns(opts)).toHaveLength(7)
  })

  it('has correct accessorKey columns', () => {
    const cols = getMedicationColumns(opts)
    expect(cols.filter((c) => 'accessorKey' in c).map((c) => (c as { accessorKey: string }).accessorKey)).toEqual([
      'code',
      'name',
      'unit',
      'requiresPrescription',
      'price',
      'isActive',
    ])
  })

  it('has correct id columns', () => {
    const cols = getMedicationColumns(opts)
    expect(cols.filter((c) => 'id' in c).map((c) => c.id)).toEqual(['actions'])
  })

  it('defines correct headers', () => {
    const cols = getMedicationColumns(opts)
    expect(cols[0].header).toBe('Código')
    expect(cols[1].header).toBe('Nombre')
    expect(cols[2].header).toBe('Unidad')
    expect(cols[3].header).toBe('Receta')
    expect(cols[5].header).toBe('Estado')
  })

  it('defines size on columns', () => {
    const cols = getMedicationColumns(opts)
    expect(cols[0].size).toBe(120)
    expect(cols[2].size).toBe(110)
    expect(cols[3].size).toBe(90)
    expect(cols[4].size).toBe(110)
    expect(cols[6].size).toBe(80)
  })
})
