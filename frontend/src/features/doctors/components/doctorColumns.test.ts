import { describe, expect, it, vi } from 'vitest'
import { getDoctorColumns } from '@/features/doctors/components/doctorColumns'

describe('getDoctorColumns', () => {
  const opts = { onEdit: vi.fn(), onDeactivate: vi.fn(), canManage: true }

  it('returns 3 columns', () => {
    expect(getDoctorColumns(opts)).toHaveLength(3)
  })

  it('has correct accessorKey columns', () => {
    const cols = getDoctorColumns(opts)
    expect(cols.filter((c) => 'accessorKey' in c).map((c) => (c as { accessorKey: string }).accessorKey)).toEqual(['specialty'])
  })

  it('has correct id columns', () => {
    const cols = getDoctorColumns(opts)
    expect(cols.filter((c) => 'id' in c).map((c) => c.id)).toEqual(['fullName', 'actions'])
  })

  it('defines correct headers', () => {
    const cols = getDoctorColumns(opts)
    expect(cols[0].header).toBe('Nombre completo')
    expect(cols[1].header).toBe('Especialidad')
  })

  it('defines size on actions column', () => {
    const cols = getDoctorColumns(opts)
    expect(cols[2].size).toBe(110)
  })
})
