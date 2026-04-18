import { describe, expect, it, vi } from 'vitest'
import { getAppointmentColumns } from '@/features/appointments/components/appointmentColumns'
import type { AppointmentSummaryResponse } from '@/types/appointment'

const mockCallbacks = {
  onConfirm: vi.fn(),
  onStart: vi.fn(),
  onCancel: vi.fn(),
  onNoShow: vi.fn(),
  canOperate: true,
}

describe('getAppointmentColumns', () => {
  it('returns 5 columns', () => {
    expect(getAppointmentColumns(mockCallbacks)).toHaveLength(5)
  })

  it('has correct accessorKey columns', () => {
    const cols = getAppointmentColumns(mockCallbacks)
    const accessorCols = cols.filter((c) => 'accessorKey' in c)
    expect(accessorCols.map((c) => (c as { accessorKey: string }).accessorKey)).toEqual([
      'scheduledAt',
      'status',
    ])
  })

  it('has correct id columns', () => {
    const cols = getAppointmentColumns(mockCallbacks)
    const idCols = cols.filter((c) => 'id' in c)
    expect(idCols.map((c) => c.id)).toEqual(['patient', 'doctor', 'actions'])
  })

  it('defines correct headers', () => {
    const cols = getAppointmentColumns(mockCallbacks)
    expect(cols[0].header).toBe('Fecha y hora')
    expect(cols[1].header).toBe('Paciente')
    expect(cols[2].header).toBe('Médico')
    expect(cols[3].header).toBe('Estado')
    expect(cols[4].header).toBeUndefined()
  })

  it('defines size on columns', () => {
    const cols = getAppointmentColumns(mockCallbacks)
    expect(cols[0].size).toBe(175)
    expect(cols[3].size).toBe(120)
    expect(cols[4].size).toBe(190)
  })

  it('returns stable references for same options', () => {
    const a = getAppointmentColumns(mockCallbacks)
    const b = getAppointmentColumns(mockCallbacks)
    expect(a).toHaveLength(b.length)
  })
})
