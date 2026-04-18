import { describe, expect, it } from 'vitest'
import { getPatientAppointmentColumns } from '@/features/patients/components/patientAppointmentColumns'

describe('getPatientAppointmentColumns', () => {
  it('returns 5 columns', () => {
    expect(getPatientAppointmentColumns()).toHaveLength(5)
  })

  it('has correct accessorKey columns', () => {
    const cols = getPatientAppointmentColumns()
    expect(cols.filter((c) => 'accessorKey' in c).map((c) => (c as { accessorKey: string }).accessorKey)).toEqual([
      'scheduledAt',
      'status',
    ])
  })

  it('has correct id columns', () => {
    const cols = getPatientAppointmentColumns()
    expect(cols.filter((c) => 'id' in c).map((c) => c.id)).toEqual(['patient', 'doctor', 'actions'])
  })

  it('defines correct headers', () => {
    const cols = getPatientAppointmentColumns()
    expect(cols[0].header).toBe('Fecha y hora')
    expect(cols[1].header).toBe('Paciente')
    expect(cols[2].header).toBe('Médico')
    expect(cols[3].header).toBe('Estado')
  })
})
