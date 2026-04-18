import { describe, expect, it } from 'vitest'
import { getPatientInvoiceColumns } from '@/features/patients/components/patientInvoiceColumns'

describe('getPatientInvoiceColumns', () => {
  it('returns 6 columns', () => {
    expect(getPatientInvoiceColumns()).toHaveLength(6)
  })

  it('has correct accessorKey columns', () => {
    const cols = getPatientInvoiceColumns()
    expect(cols.filter((c) => 'accessorKey' in c).map((c) => (c as { accessorKey: string }).accessorKey)).toEqual([
      'invoiceNumber',
      'status',
      'issueDate',
      'dueDate',
      'total',
    ])
  })

  it('has correct id columns', () => {
    const cols = getPatientInvoiceColumns()
    expect(cols.filter((c) => 'id' in c).map((c) => c.id)).toEqual(['actions'])
  })

  it('defines correct headers', () => {
    const cols = getPatientInvoiceColumns()
    expect(cols[0].header).toBe('Factura')
    expect(cols[1].header).toBe('Estado')
    expect(cols[2].header).toBe('Emision')
    expect(cols[3].header).toBe('Vencimiento')
  })

  it('defines size on columns', () => {
    const cols = getPatientInvoiceColumns()
    expect(cols[0].size).toBe(140)
    expect(cols[1].size).toBe(120)
    expect(cols[4].size).toBe(120)
    expect(cols[5].size).toBe(60)
  })
})
