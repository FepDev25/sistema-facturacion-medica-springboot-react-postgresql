import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createAllProviders } from '@/test/test-utils'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/invoices/api/invoicesApi', () => ({
  getInvoices: vi.fn(),
  getInvoiceById: vi.fn(),
  getInvoicePayments: vi.fn(),
  confirmInvoice: vi.fn(),
  markInvoiceOverdue: vi.fn(),
  cancelInvoice: vi.fn(),
  registerPayment: vi.fn(),
  addInvoiceItem: vi.fn(),
  removeInvoiceItem: vi.fn(),
  assignInvoiceInsurancePolicy: vi.fn(),
}))

import * as invoicesApi from '@/features/invoices/api/invoicesApi'
import {
  useInvoices,
  useInvoice,
  useInvoicePayments,
  useConfirmInvoice,
  useRegisterPayment,
  useAddInvoiceItem,
  useRemoveInvoiceItem,
} from '@/features/invoices/hooks/useInvoices'
import { invoiceKeys } from '@/features/invoices/hooks/useInvoices'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('invoiceKeys', () => {
  it('creates correct list key', () => {
    expect(invoiceKeys.list({ status: 'paid' })).toEqual(['invoices', 'list', { status: 'paid' }])
  })

  it('creates correct detail key', () => {
    expect(invoiceKeys.detail('inv-1')).toEqual(['invoices', 'detail', 'inv-1'])
  })

  it('creates correct payments key', () => {
    expect(invoiceKeys.payments('inv-1')).toEqual(['invoices', 'payments', 'inv-1'])
  })
})

describe('useInvoices', () => {
  it('fetches invoices', async () => {
    vi.mocked(invoicesApi.getInvoices).mockResolvedValue({
      content: [], totalElements: 0, totalPages: 0, number: 0, size: 20, first: true, last: true, empty: true,
    })
    const { result } = renderHook(() => useInvoices(), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invoicesApi.getInvoices).toHaveBeenCalledWith({ status: undefined, startDate: undefined, endDate: undefined, page: 0, size: 20 })
  })
})

describe('useInvoice', () => {
  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useInvoice(''), { wrapper: createAllProviders() })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fetches invoice by id', async () => {
    vi.mocked(invoicesApi.getInvoiceById).mockResolvedValue({
      id: 'inv-1', patientId: 'p-1', patientFirstName: 'Juan', patientLastName: 'Perez',
      appointmentId: null, insurancePolicyId: null, invoiceNumber: 'INV-001',
      subtotal: 900, tax: 100, total: 1000, insuranceCoverage: 0, patientResponsibility: 1000,
      status: 'pending', issueDate: '2025-01-01', dueDate: '2025-02-01', notes: null,
      items: [], payments: [], createdAt: '2025-01-01T00:00:00Z', updatedAt: null,
    })
    const { result } = renderHook(() => useInvoice('inv-1'), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invoicesApi.getInvoiceById).toHaveBeenCalledWith('inv-1')
  })
})

describe('useInvoicePayments', () => {
  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useInvoicePayments(''), { wrapper: createAllProviders() })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('unwraps content via select', async () => {
    vi.mocked(invoicesApi.getInvoicePayments).mockResolvedValue({
      content: [{ id: 'pay-1', amount: 500 }],
      totalElements: 1, totalPages: 1, number: 0, size: 200, first: true, last: true, empty: false,
    })
    const { result } = renderHook(() => useInvoicePayments('inv-1'), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 'pay-1', amount: 500 }])
  })
})

describe('useConfirmInvoice', () => {
  it('calls confirmInvoice with id', async () => {
    vi.mocked(invoicesApi.confirmInvoice).mockResolvedValue({ id: 'inv-1', status: 'confirmed' } as never)
    const { result } = renderHook(() => useConfirmInvoice(), { wrapper: createAllProviders() })
    result.current.mutate('inv-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invoicesApi.confirmInvoice).toHaveBeenCalledWith('inv-1', expect.anything())
  })
})

describe('useRegisterPayment', () => {
  it('calls registerPayment with payment data', async () => {
    vi.mocked(invoicesApi.registerPayment).mockResolvedValue({ id: 'pay-1' } as never)
    const { result } = renderHook(() => useRegisterPayment('inv-1'), { wrapper: createAllProviders() })
    const paymentData = { invoiceId: 'inv-1', amount: 500, paymentMethod: 'cash', paymentDate: '2025-06-20T10:00:00Z' }
    result.current.mutate(paymentData)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invoicesApi.registerPayment).toHaveBeenCalledWith(paymentData)
  })
})

describe('useAddInvoiceItem', () => {
  it('calls addInvoiceItem with invoice id and item data', async () => {
    vi.mocked(invoicesApi.addInvoiceItem).mockResolvedValue({ id: 'item-1' } as never)
    const { result } = renderHook(() => useAddInvoiceItem('inv-1'), { wrapper: createAllProviders() })
    const itemData = { itemType: 'service', serviceId: 'svc-1', description: 'Consulta', quantity: 1, unitPrice: 500 }
    result.current.mutate(itemData)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invoicesApi.addInvoiceItem).toHaveBeenCalledWith('inv-1', itemData)
  })
})

describe('useRemoveInvoiceItem', () => {
  it('calls removeInvoiceItem with invoice id and item id', async () => {
    vi.mocked(invoicesApi.removeInvoiceItem).mockResolvedValue(undefined)
    const { result } = renderHook(() => useRemoveInvoiceItem('inv-1'), { wrapper: createAllProviders() })
    result.current.mutate('item-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invoicesApi.removeInvoiceItem).toHaveBeenCalledWith('inv-1', 'item-1')
  })
})
