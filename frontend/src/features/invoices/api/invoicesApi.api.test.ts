import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getInvoices,
  getInvoiceById,
  getInvoiceByAppointment,
  getInvoicePayments,
  confirmInvoice,
  markInvoiceOverdue,
  cancelInvoice,
  registerPayment,
  addInvoiceItem,
  removeInvoiceItem,
  assignInvoiceInsurancePolicy,
  toPaymentCreateRequest,
  toInvoiceItemRequest,
} from '@/features/invoices/api/invoicesApi'
import type { PaymentFormValues, InvoiceItemFormValues } from '@/features/invoices/api/invoicesApi'

vi.mock('@/lib/axios', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: { headers: { common: {} } },
  },
}))

import { apiClient as mockedClient } from '@/lib/axios'

const mockGet = vi.mocked(mockedClient.get)
const mockPost = vi.mocked(mockedClient.post)
const mockPatch = vi.mocked(mockedClient.patch)
const mockDelete = vi.mocked(mockedClient.delete)

beforeEach(() => {
  vi.clearAllMocks()
})

const apiInvoiceView = {
  id: 'inv-1',
  patientId: 'p-1',
  patientFirstName: 'Juan',
  patientLastName: 'Perez',
  patientDni: '12345678',
  patientAllergies: 'Penicilina',
  appointmentId: 'apt-1',
  appointmentScheduledAt: '2025-06-20T10:00:00Z',
  appointmentStatus: 'completed',
  appointmentChiefComplaint: 'Dolor',
  insurancePolicyId: null,
  insurancePolicyPolicyNumber: null,
  insurancePolicyProviderName: null,
  insurancePolicyCoveragePercentage: null,
  subtotal: 900,
  tax: 100,
  total: 1000,
  insuranceCoverage: 0,
  patientResponsibility: 1000,
  status: 'pending' as const,
  issueDate: '2025-06-20',
  dueDate: '2025-07-20',
  notes: null,
  items: [{
    id: 'item-1', serviceId: 'svc-1', serviceCode: 'C-001', serviceName: 'Consulta',
    servicePrice: 500, medicationId: null, medicationCode: null, medicationName: null,
    medicationRequiresPrescription: null, itemType: 'service' as const, description: 'Consulta general',
    quantity: 1, unitPrice: 500, subtotal: 500, createdAt: '2025-06-20T10:00:00Z',
  }],
  createdAt: '2025-06-20T10:00:00Z',
  updatedAt: '2025-06-20T10:00:00Z',
}

describe('invoices API', () => {
  describe('getInvoices', () => {
    it('fetches invoices from /invoices/view and maps response', async () => {
      const apiListItem = {
        id: 'inv-1', patientId: 'p-1', patientFirstName: 'Juan', patientLastName: 'Perez',
        invoiceNumber: 'INV-001', total: 1000, patientResponsibility: 1000,
        status: 'pending' as const, issueDate: '2025-06-20', dueDate: '2025-07-20', createdAt: '2025-06-20T10:00:00Z',
      }
      mockGet.mockResolvedValue({
        data: {
          content: [apiListItem], totalElements: 1, totalPages: 1,
          number: 0, size: 20, first: true, last: true, empty: false,
        },
      })
      const result = await getInvoices()
      expect(mockGet).toHaveBeenCalledWith('/invoices/view', {
        params: { patientId: undefined, status: undefined, startDate: undefined, endDate: undefined, page: 0, size: 20, sort: undefined },
      })
      expect(result.content[0].invoiceNumber).toBe('INV-001')
      expect(result.content[0].patientFirstName).toBe('Juan')
    })

    it('uppercases status filter', async () => {
      mockGet.mockResolvedValue({ data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20, first: true, last: true, empty: true } })
      await getInvoices({ status: 'paid' })
      expect(mockGet).toHaveBeenCalledWith('/invoices/view', {
        params: expect.objectContaining({ status: 'PAID' }),
      })
    })
  })

  describe('getInvoiceById', () => {
    it('fetches and maps invoice detail', async () => {
      mockGet.mockResolvedValue({ data: apiInvoiceView })
      const result = await getInvoiceById('inv-1')
      expect(mockGet).toHaveBeenCalledWith('/invoices/inv-1/view')
      expect(result.items).toHaveLength(1)
      expect(result.payments).toEqual([])
      expect(result.subtotal).toBe(900)
      expect(result.tax).toBe(100)
    })
  })

  describe('getInvoiceByAppointment', () => {
    it('returns mapped invoice when found', async () => {
      mockGet.mockResolvedValue({ data: apiInvoiceView })
      const result = await getInvoiceByAppointment('apt-1')
      expect(mockGet).toHaveBeenCalledWith('/invoices/appointment/apt-1')
      expect(result?.id).toBe('inv-1')
    })

    it('returns null on error', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))
      const result = await getInvoiceByAppointment('apt-999')
      expect(result).toBeNull()
    })
  })

  describe('getInvoicePayments', () => {
    it('fetches and maps payments', async () => {
      const apiPayment = {
        id: 'pay-1', invoiceId: 'inv-1', invoiceNumber: 'INV-001', amount: 500,
        paymentMethod: 'cash' as const, referenceNumber: null, notes: null,
        paymentDate: '2025-06-20', createdAt: '2025-06-20T10:00:00Z',
      }
      mockGet.mockResolvedValue({
        data: {
          content: [apiPayment], totalElements: 1, totalPages: 1,
          number: 0, size: 200, first: true, last: true, empty: false,
        },
      })
      const result = await getInvoicePayments('inv-1')
      expect(mockGet).toHaveBeenCalledWith('/payments/invoice/inv-1', {
        params: { page: 0, size: 200 },
      })
      expect(result.content[0].amount).toBe(500)
    })
  })

  describe('status transitions', () => {
    it('confirmInvoice patches then refetches', async () => {
      mockPatch.mockResolvedValue({ data: undefined })
      mockGet.mockResolvedValue({ data: apiInvoiceView })
      const result = await confirmInvoice('inv-1')
      expect(mockPatch).toHaveBeenCalledWith('/invoices/inv-1/confirm')
      expect(result.id).toBe('inv-1')
    })

    it('markInvoiceOverdue patches then refetches', async () => {
      mockPatch.mockResolvedValue({ data: undefined })
      mockGet.mockResolvedValue({ data: apiInvoiceView })
      await markInvoiceOverdue('inv-1')
      expect(mockPatch).toHaveBeenCalledWith('/invoices/inv-1/overdue')
    })

    it('cancelInvoice patches then refetches', async () => {
      mockPatch.mockResolvedValue({ data: undefined })
      mockGet.mockResolvedValue({ data: apiInvoiceView })
      await cancelInvoice('inv-1')
      expect(mockPatch).toHaveBeenCalledWith('/invoices/inv-1/cancel')
    })
  })

  describe('registerPayment', () => {
    it('posts payment and maps response', async () => {
      const apiPayment = {
        id: 'pay-1', invoiceId: 'inv-1', invoiceNumber: 'INV-001', amount: 500,
        paymentMethod: 'cash' as const, referenceNumber: 'REF-001', notes: 'Pago parcial',
        paymentDate: '2025-06-20T10:00:00Z', createdAt: '2025-06-20T10:00:00Z',
      }
      mockPost.mockResolvedValue({ data: apiPayment })
      const result = await registerPayment({ invoiceId: 'inv-1', amount: 500, paymentMethod: 'cash', paymentDate: '2025-06-20T10:00:00Z' })
      expect(mockPost).toHaveBeenCalledWith('/payments', expect.objectContaining({ invoiceId: 'inv-1' }))
      expect(result.amount).toBe(500)
      expect(result.referenceNumber).toBe('REF-001')
    })
  })

  describe('addInvoiceItem', () => {
    it('posts invoice item', async () => {
      const item = { id: 'item-1', itemType: 'service' as const, serviceId: 'svc-1', serviceName: 'Consulta', medicationId: null, medicationName: null, description: 'Consulta', quantity: 1, unitPrice: 500, subtotal: 500, createdAt: '2025-06-20T10:00:00Z' }
      mockPost.mockResolvedValue({ data: item })
      const result = await addInvoiceItem('inv-1', { itemType: 'service', serviceId: 'svc-1', description: 'Consulta', quantity: 1, unitPrice: 500 })
      expect(mockPost).toHaveBeenCalledWith('/invoices/inv-1/items', expect.objectContaining({ itemType: 'service' }))
      expect(result.description).toBe('Consulta')
    })
  })

  describe('removeInvoiceItem', () => {
    it('deletes invoice item', async () => {
      mockDelete.mockResolvedValue({ data: undefined })
      await removeInvoiceItem('inv-1', 'item-1')
      expect(mockDelete).toHaveBeenCalledWith('/invoices/inv-1/items/item-1')
    })
  })

  describe('assignInvoiceInsurancePolicy', () => {
    it('patches insurance policy and refetches', async () => {
      const updatedView = { ...apiInvoiceView, insurancePolicyId: 'pol-1' }
      mockPatch.mockResolvedValue({ data: undefined })
      mockGet.mockResolvedValue({ data: updatedView })
      const result = await assignInvoiceInsurancePolicy('inv-1', { insurancePolicyId: 'pol-1' })
      expect(mockPatch).toHaveBeenCalledWith('/invoices/inv-1/insurance-policy', { insurancePolicyId: 'pol-1' })
      expect(result.insurancePolicyId).toBe('pol-1')
    })
  })
})

describe('invoice adapters', () => {
  describe('toPaymentCreateRequest', () => {
    it('builds payment request with nullified empty optionals', () => {
      const values: PaymentFormValues = {
        amount: 500, paymentMethod: 'cash', paymentDate: '2025-06-20',
        referenceNumber: ' REF-001 ', notes: '  ',
      }
      const result = toPaymentCreateRequest('inv-1', values)
      expect(result.invoiceId).toBe('inv-1')
      expect(result.referenceNumber).toBe('REF-001')
      expect(result.notes).toBeNull()
      expect(result.paymentDate).toContain('T')
    })
  })

  describe('toInvoiceItemRequest', () => {
    it('sets serviceId for service type', () => {
      const values: InvoiceItemFormValues = {
        itemType: 'service', serviceId: 'svc-1', description: 'Consulta', quantity: 1, unitPrice: 500,
      }
      const result = toInvoiceItemRequest(values)
      expect(result.serviceId).toBe('svc-1')
      expect(result.medicationId).toBeNull()
    })

    it('sets medicationId for medication type', () => {
      const values: InvoiceItemFormValues = {
        itemType: 'medication', medicationId: 'med-1', description: 'Ibuprofeno', quantity: 10, unitPrice: 50,
      }
      const result = toInvoiceItemRequest(values)
      expect(result.medicationId).toBe('med-1')
      expect(result.serviceId).toBeNull()
    })

    it('nullifies ids for non-service/medication types', () => {
      const values: InvoiceItemFormValues = {
        itemType: 'procedure', description: 'Procedimiento', quantity: 1, unitPrice: 200,
      }
      const result = toInvoiceItemRequest(values)
      expect(result.serviceId).toBeNull()
      expect(result.medicationId).toBeNull()
    })

    it('trims description', () => {
      const values: InvoiceItemFormValues = {
        itemType: 'other', description: '  Otro  ', quantity: 1, unitPrice: 100,
      }
      const result = toInvoiceItemRequest(values)
      expect(result.description).toBe('Otro')
    })
  })
})
