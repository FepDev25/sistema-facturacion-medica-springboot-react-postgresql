import { describe, expect, it, vi } from 'vitest'
import { getInvoiceColumns } from '@/features/invoices/components/invoiceColumns'

const mockCallbacks = {
  onConfirm: vi.fn(),
  onOverdue: vi.fn(),
  onCancel: vi.fn(),
  canManage: true,
}

describe('getInvoiceColumns', () => {
  it('returns 7 columns', () => {
    expect(getInvoiceColumns(mockCallbacks)).toHaveLength(7)
  })

  it('has correct accessorKey columns', () => {
    const cols = getInvoiceColumns(mockCallbacks)
    const accessorCols = cols.filter((c) => 'accessorKey' in c)
    expect(accessorCols.map((c) => (c as { accessorKey: string }).accessorKey)).toEqual([
      'invoiceNumber',
      'status',
      'dueDate',
      'total',
      'patientResponsibility',
    ])
  })

  it('has correct id columns', () => {
    const cols = getInvoiceColumns(mockCallbacks)
    const idCols = cols.filter((c) => 'id' in c)
    expect(idCols.map((c) => c.id)).toEqual(['patientName', 'actions'])
  })

  it('defines correct headers', () => {
    const cols = getInvoiceColumns(mockCallbacks)
    expect(cols[0].header).toBe('Factura')
    expect(cols[1].header).toBe('Paciente')
    expect(cols[2].header).toBe('Estado')
    expect(cols[3].header).toBe('Vencimiento')
    expect(cols[6].header).toBeUndefined()
  })

  it('enables sorting on key columns', () => {
    const cols = getInvoiceColumns(mockCallbacks)
    expect(cols[0].enableSorting).toBe(true)
    expect(cols[2].enableSorting).toBe(true)
    expect(cols[3].enableSorting).toBe(true)
    expect(cols[4].enableSorting).toBe(true)
  })
})
