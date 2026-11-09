import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const { m, mockUseInvoices } = vi.hoisted(() => ({
  m: {
    canManageInvoices: true,
    page: {
      content: [] as Array<Record<string, unknown>>,
      totalElements: 0,
      totalPages: 1,
      number: 0,
      size: 20,
      first: true,
      last: true,
      empty: true,
    },
    isLoading: false,
  },
  mockUseInvoices: vi.fn(),
}))

vi.mock('../../hooks/useInvoices', () => ({
  useInvoices: (params: unknown) => {
    mockUseInvoices(params)
    return { data: m.page, isLoading: m.isLoading }
  },
  useConfirmInvoice: () => ({ mutate: vi.fn() }),
  useOverdueInvoice: () => ({ mutate: vi.fn() }),
  useCancelInvoice: () => ({ mutate: vi.fn() }),
}))

vi.mock('@/features/auth/hooks/useRolePermissions', () => ({
  useRolePermissions: () => ({ canManageInvoices: m.canManageInvoices }),
  NO_PERMISSION_MESSAGE: 'No tienes permisos.',
}))

vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}))

vi.mock('@/components/DataTable', () => ({
  DataTable: ({ data }: { data: Array<{ id: string; invoiceNumber: string }> }) => (
    <div data-testid="invoice-table">
      {data.map((invoice) => (
        <span key={invoice.id}>{invoice.invoiceNumber}</span>
      ))}
    </div>
  ),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import { InvoicesPage } from '@/features/invoices/components/InvoicesPage'

function reset() {
  m.canManageInvoices = true
  m.isLoading = false
  m.page = {
    content: [],
    totalElements: 0,
    totalPages: 1,
    number: 0,
    size: 20,
    first: true,
    last: true,
    empty: true,
  }
}

describe('InvoicesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reset()
  })
  afterEach(cleanup)

  it('solicita la primera página sin filtros y pinta las facturas', () => {
    m.page = {
      ...m.page,
      content: [
        { id: 'inv-1', invoiceNumber: 'FAC-2026-00001' },
        { id: 'inv-2', invoiceNumber: 'FAC-2026-00002' },
      ],
      totalElements: 2,
      empty: false,
    }

    render(<InvoicesPage />)

    expect(screen.getByRole('heading', { name: 'Facturas' })).toBeInTheDocument()
    expect(screen.getByText('FAC-2026-00001')).toBeInTheDocument()
    expect(screen.getByText('FAC-2026-00002')).toBeInTheDocument()
    expect(mockUseInvoices).toHaveBeenCalledWith({
      status: undefined,
      startDate: undefined,
      endDate: undefined,
      page: 0,
      size: 20,
    })
  })

  it('avanza a la página siguiente', () => {
    m.page = { ...m.page, totalElements: 40, totalPages: 2, number: 0, empty: false }

    render(<InvoicesPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Pagina siguiente' }))

    expect(mockUseInvoices).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }))
  })
})
