import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

function MockSelect({ children, value }: { children?: React.ReactNode; value?: string }) {
  return <div data-testid="select" data-value={value}>{children}</div>
}
function MockSelectTrigger({ children }: { children?: React.ReactNode }) { return <div>{children}</div> }
function MockSelectContent({ children }: { children?: React.ReactNode }) { return <div>{children}</div> }
function MockSelectItem({ children }: { children?: React.ReactNode }) { return <span>{children}</span> }
function MockSelectValue({ placeholder }: { placeholder?: string }) { return <span>{placeholder}</span> }

const { m, mockConfirmMutate, mockAssignPolicy, mockRemoveItem, mockAddItem } = vi.hoisted(() => ({
  m: {
    invoiceData: null as unknown,
    paymentsData: [] as unknown[],
    medicalRecordData: null as unknown,
    patientPolicies: [] as unknown[],
    permissions: { canManageInvoices: true, canRegisterPayments: true },
  },
  mockConfirmMutate: vi.fn(),
  mockAssignPolicy: vi.fn(),
  mockRemoveItem: vi.fn(),
  mockAddItem: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => {
  const routerState = { location: { pathname: '/invoices/inv-1' }, matches: {} }
  return {
    useParams: () => ({ id: 'inv-1' }),
    useRouterState: () => routerState,
    useNavigate: () => vi.fn(),
    Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode; className?: string; [key: string]: unknown }) => (
      <a href={to} {...rest}>{children}</a>
    ),
  }
})

vi.mock('@/features/invoices/hooks/useInvoices', () => ({
  useInvoice: () => ({ data: m.invoiceData, isLoading: false }),
  useInvoicePayments: () => ({ data: m.paymentsData }),
  useConfirmInvoice: () => ({ mutate: mockConfirmMutate, isPending: false }),
  useAssignInvoiceInsurancePolicy: () => ({ mutate: mockAssignPolicy, isPending: false }),
  useRemoveInvoiceItem: () => ({ mutate: mockRemoveItem, isPending: false }),
  useAddInvoiceItem: () => ({ mutate: mockAddItem, isPending: false }),
  useInvoices: () => ({ data: null }),
}))

vi.mock('@/features/auth/hooks/useRolePermissions', () => ({
  useRolePermissions: () => m.permissions,
  NO_PERMISSION_MESSAGE: 'No tienes permisos.',
}))

vi.mock('@/features/insurance/hooks/useInsurance', () => ({
  usePolicies: () => ({ data: m.patientPolicies }),
}))

vi.mock('@/features/appointments/hooks/useAppointments', () => ({
  useAppointmentMedicalRecord: () => ({ data: m.medicalRecordData }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/features/invoices/components/InvoiceCoverageBar', () => ({
  InvoiceCoverageBar: () => <div data-testid="coverage-bar">CoverageBar</div>,
}))
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>()
  return {
    ...actual,
    formatCurrency: (n: number) => `$${n.toFixed(2)}`,
    formatDate: (d: string) => d,
    formatDateTime: (d: string) => d,
  }
})

vi.mock('@/components/BackToListButton', () => ({
  BackToListButton: ({ label }: { label: string }) => <button>{label}</button>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className} data-testid="badge">{children}</span>
  ),
}))

vi.mock('@/components/ui/select', () => ({
  Select: MockSelect, SelectTrigger: MockSelectTrigger, SelectContent: MockSelectContent, SelectItem: MockSelectItem, SelectValue: MockSelectValue,
}))
vi.mock('@/components/ui/checkbox', () => ({ Checkbox: MockCheckbox }))

vi.mock('@/features/invoices/components/PaymentDrawer', () => ({
  PaymentDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="payment-drawer">PaymentDrawer</div> : null,
}))

vi.mock('@/features/invoices/components/InvoiceItemDrawer', () => ({
  InvoiceItemDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="item-drawer">ItemDrawer</div> : null,
}))

import { InvoiceDetailPage } from '@/features/invoices/components/InvoiceDetailPage'

const baseInvoice = {
  id: 'inv-1',
  invoiceNumber: 'FAC-001',
  status: 'draft' as const,
  issueDate: '2025-06-01',
  dueDate: '2025-06-30',
  subtotal: 1000,
  tax: 160,
  total: 1160,
  insuranceCoverage: 500,
  patientResponsibility: 660,
  patientId: 'pat-1',
  patientFirstName: 'Ana',
  patientLastName: 'García',
  appointmentId: 'apt-1',
  insurancePolicyId: null,
  items: [
    { id: 'item-1', description: 'Consulta', quantity: 1, unitPrice: 1000, subtotal: 1000 },
  ],
  createdAt: '2025-06-01T12:00:00',
  updatedAt: '2025-06-01T12:00:00',
}

const basePayment = {
  id: 'pay-1',
  amount: 660,
  paymentDate: '2025-06-15T12:00:00',
  paymentMethod: 'cash' as const,
  referenceNumber: null,
  notes: null,
}

function reset() {
  m.invoiceData = { ...baseInvoice }
  m.paymentsData = []
  m.medicalRecordData = null
  m.patientPolicies = []
  m.permissions = { canManageInvoices: true, canRegisterPayments: true }
}

describe('InvoiceDetailPage', () => {
  beforeEach(() => { vi.clearAllMocks(); reset() })
  afterEach(cleanup)

  it('shows not found state when invoice is null', () => {
    m.invoiceData = null
    render(<InvoiceDetailPage />)
    expect(screen.getByText('No se encontro la factura.')).toBeInTheDocument()
    expect(screen.getByText('Volver a facturas')).toBeInTheDocument()
  })

  it('renders financial summary section', () => {
    render(<InvoiceDetailPage />)
    expect(screen.getByText('Resumen financiero')).toBeInTheDocument()
    expect(screen.getByText('Estado')).toBeInTheDocument()
    expect(screen.getByText('Emision')).toBeInTheDocument()
    expect(screen.getByText('Vencimiento')).toBeInTheDocument()
    expect(screen.getByText('Subtotal')).toBeInTheDocument()
    expect(screen.getByText('Impuestos')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Cobertura seguro')).toBeInTheDocument()
    expect(screen.getByText('Responsabilidad paciente')).toBeInTheDocument()
    expect(screen.getByText('Pagado')).toBeInTheDocument()
    expect(screen.getByText('Saldo')).toBeInTheDocument()
  })

  it('renders patient name', () => {
    render(<InvoiceDetailPage />)
    expect(screen.getByText('Ana García')).toBeInTheDocument()
  })

  it('renders InvoiceCoverageBar', () => {
    render(<InvoiceDetailPage />)
    expect(screen.getByTestId('coverage-bar')).toBeInTheDocument()
  })

  describe('isDraft conditionals', () => {
    it('shows Confirmar factura button when draft', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getByText('Confirmar factura')).toBeInTheDocument()
    })

    it('hides Confirmar factura button when not draft', () => {
      m.invoiceData = { ...baseInvoice, status: 'confirmed' }
      render(<InvoiceDetailPage />)
      expect(screen.queryByText('Confirmar factura')).not.toBeInTheDocument()
    })

    it('shows Agregar item button when draft', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getByText('Agregar item')).toBeInTheDocument()
    })

    it('hides Agregar item button when not draft', () => {
      m.invoiceData = { ...baseInvoice, status: 'confirmed' }
      render(<InvoiceDetailPage />)
      expect(screen.queryByText('Agregar item')).not.toBeInTheDocument()
    })

    it('shows Policy Select when draft', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getByText(/Poliza para esta factura|Poliza para la factura/)).toBeInTheDocument()
      expect(screen.getByTestId('select')).toBeInTheDocument()
    })

    it('hides Policy Select when not draft', () => {
      m.invoiceData = { ...baseInvoice, status: 'confirmed' }
      render(<InvoiceDetailPage />)
      expect(screen.queryByText(/Poliza para esta factura/)).not.toBeInTheDocument()
    })

    it('shows Aplicar poliza and Quitar poliza buttons when draft', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getByText('Aplicar poliza')).toBeInTheDocument()
      expect(screen.getByText('Quitar poliza')).toBeInTheDocument()
    })

    it('hides Aplicar poliza and Quitar poliza buttons when not draft', () => {
      m.invoiceData = { ...baseInvoice, status: 'confirmed' }
      render(<InvoiceDetailPage />)
      expect(screen.queryByText('Aplicar poliza')).not.toBeInTheDocument()
      expect(screen.queryByText('Quitar poliza')).not.toBeInTheDocument()
    })

    it('disables Confirmar factura when total is 0', () => {
      m.invoiceData = { ...baseInvoice, total: 0 }
      render(<InvoiceDetailPage />)
      expect(screen.getByText('Confirmar factura')).toBeInTheDocument()
      const btn = screen.getByText('Confirmar factura').closest('button')
      expect(btn).toBeDisabled()
    })
  })

  describe('payments section', () => {
    it('shows Registrar pago button', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getByText('Registrar pago')).toBeInTheDocument()
    })

    it('disables Registrar pago when is draft', () => {
      render(<InvoiceDetailPage />)
      const btn = screen.getByText('Registrar pago').closest('button')
      expect(btn).toBeDisabled()
    })

    it('enables Registrar pago when not draft', () => {
      m.invoiceData = { ...baseInvoice, status: 'confirmed' }
      render(<InvoiceDetailPage />)
      const btn = screen.getByText('Registrar pago').closest('button')
      expect(btn).not.toBeDisabled()
    })

    it('shows empty payments message when no payments', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getByText('No hay pagos registrados para esta factura.')).toBeInTheDocument()
    })

    it('renders payment details when payments exist', () => {
      m.paymentsData = [basePayment]
      render(<InvoiceDetailPage />)
      expect(screen.queryByText('No hay pagos registrados')).not.toBeInTheDocument()
    })
  })

  describe('items section', () => {
    it('renders invoice items', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getByText('Items facturados')).toBeInTheDocument()
      expect(screen.getByText('Consulta')).toBeInTheDocument()
    })

    it('renders item details with quantity and price', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getByText(/1 x/)).toBeInTheDocument()
    })
  })
})
