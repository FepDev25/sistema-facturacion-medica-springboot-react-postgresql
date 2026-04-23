import { useEffect, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ClipboardList, CreditCard, FileText, Loader2, Plus, Shield, Sparkles, Trash2, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BackToListButton } from '@/components/BackToListButton'
import {
  NO_PERMISSION_MESSAGE,
  useRolePermissions,
} from '@/features/auth/hooks/useRolePermissions'
import { usePolicies } from '@/features/insurance/hooks/useInsurance'
import { INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/types/enums'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { useAppointmentMedicalRecord } from '@/features/appointments/hooks/useAppointments'
import { ItemSuggestionPanel } from '@/features/ai/components/ItemSuggestionPanel'
import { useSuggestItems } from '@/features/ai/hooks/useAi'
import {
  useAddInvoiceItem,
  useAssignInvoiceInsurancePolicy,
  useConfirmInvoice,
  useInvoice,
  useInvoicePayments,
  useRemoveInvoiceItem,
} from '../../hooks/useInvoices'
import { InvoiceCoverageBar } from '../InvoiceCoverageBar'
import { InvoiceItemDrawer } from '../InvoiceItemDrawer'
import { PaymentDrawer } from '../PaymentDrawer'

const STATUS_CLASS: Record<string, string> = {
  draft: 'border-slate-200 text-slate-600 bg-slate-50',
  pending: 'border-blue-200 text-blue-700 bg-blue-50',
  partial_paid: 'border-cyan-200 text-cyan-700 bg-cyan-50',
  paid: 'border-green-200 text-green-700 bg-green-50',
  cancelled: 'border-slate-200 text-slate-600 bg-slate-50',
  overdue: 'border-amber-200 text-amber-700 bg-amber-50',
}

export function InvoiceDetailPage() {
  const { canManageInvoices, canRegisterPayments } = useRolePermissions()

  const { id } = useParams({ from: '/invoices/$id' })
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false)
  const [itemDrawerOpen, setItemDrawerOpen] = useState(false)
  const [selectedPolicyId, setSelectedPolicyId] = useState('')
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)

  const suggestItems = useSuggestItems()

  const invoiceQuery = useInvoice(id)
  const paymentsQuery = useInvoicePayments(id)
  const medicalRecordQuery = useAppointmentMedicalRecord(invoiceQuery.data?.appointmentId ?? '')

  const confirmInvoice = useConfirmInvoice()
  const assignInsurancePolicy = useAssignInvoiceInsurancePolicy(id)
  const removeInvoiceItem = useRemoveInvoiceItem(id)
  const addInvoiceItem = useAddInvoiceItem(id)

  const { data: patientPolicies = [] } = usePolicies({
    patientId: invoiceQuery.data?.patientId,
    onlyActive: true,
  })

  useEffect(() => {
    if (invoiceQuery.data?.insurancePolicyId) {
      setSelectedPolicyId(invoiceQuery.data.insurancePolicyId)
    }
  }, [invoiceQuery.data?.insurancePolicyId])

  if (invoiceQuery.isLoading) {
    return <div className="px-6 py-8 text-sm text-slate-500">Cargando factura...</div>
  }

  const invoice = invoiceQuery.data
  if (!invoice) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-slate-500 mb-4">No se encontro la factura.</p>
        <BackToListButton fallbackTo="/invoices" label="Volver a facturas" />
      </div>
    )
  }

  const payments = paymentsQuery.data ?? []
  const isDraft = invoice.status === 'draft'

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{invoice.invoiceNumber}</h1>
            <p className="text-sm text-slate-500 mt-0.5">Detalle de factura y cobranza</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {isDraft && (
              <Button
                size="sm"
                variant="outline"
                disabled={!canManageInvoices || invoice.total === 0 || confirmInvoice.isPending}
                title={invoice.total === 0 ? 'Agrega ítems antes de confirmar' : 'Confirmar factura'}
                onClick={() => {
                  if (!canManageInvoices) {
                    toast.error(NO_PERMISSION_MESSAGE)
                    return
                  }
                  confirmInvoice.mutate(invoice.id)
                }}
              >
                {confirmInvoice.isPending ? 'Confirmando...' : 'Confirmar factura'}
              </Button>
            )}
            <Button
              size="sm"
              disabled={!canRegisterPayments || isDraft}
              onClick={() => {
                if (!canRegisterPayments) {
                  toast.error(NO_PERMISSION_MESSAGE)
                  return
                }
                setPaymentDrawerOpen(true)
              }}
            >
              Registrar pago
            </Button>
            <BackToListButton fallbackTo="/invoices" label="Volver a facturas" />
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-5 overflow-auto space-y-6">
        <section className="rounded-md border border-border bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Resumen financiero</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Estado</p>
              <Badge variant="outline" className={STATUS_CLASS[invoice.status]}>
                {INVOICE_STATUS_LABELS[invoice.status]}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-slate-500">Emision</p>
              <p className="text-sm text-slate-800">{formatDate(invoice.issueDate)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Vencimiento</p>
              <p className="text-sm text-slate-800">{formatDate(invoice.dueDate)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Subtotal</p>
              <p className="text-sm text-slate-800">{formatCurrency(invoice.subtotal)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Impuestos</p>
              <p className="text-sm text-slate-800">{formatCurrency(invoice.tax)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-sm font-medium text-slate-900">{formatCurrency(invoice.total)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Cobertura seguro</p>
              <p className="text-sm text-slate-800">{formatCurrency(invoice.insuranceCoverage)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Responsabilidad paciente</p>
              <p className="text-sm font-medium text-slate-900">
                {formatCurrency(invoice.patientResponsibility)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Pagado</p>
              <p className="text-sm text-slate-800">
                {formatCurrency(payments.reduce((acc, item) => acc + item.amount, 0))}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Saldo</p>
              <p className="text-sm font-medium text-slate-900">
                {formatCurrency(
                  Math.max(
                    invoice.patientResponsibility -
                      payments.reduce((acc, item) => acc + item.amount, 0),
                    0,
                  ),
                )}
              </p>
            </div>
          </div>
        </section>

        <InvoiceCoverageBar
          total={invoice.total}
          insuranceCoverage={invoice.insuranceCoverage}
          patientResponsibility={invoice.patientResponsibility}
        />

        <section className="rounded-md border border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <UserRound className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Paciente y cobertura</h2>
          </div>
          <p className="text-sm text-slate-800">
            {invoice.patientFirstName} {invoice.patientLastName}
          </p>
          {medicalRecordQuery.data && (
            <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-green-700" />
                <p className="text-xs font-medium text-green-800">Expediente médico asociado</p>
              </div>
              <Link
                to="/medical-records/$id"
                params={{ id: medicalRecordQuery.data.id }}
                className="text-xs text-green-800 underline hover:text-green-900"
              >
                Ver expediente
              </Link>
            </div>
          )}

          {isDraft ? (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-2">
              <div className="w-full sm:w-80">
                <p className="text-xs text-slate-500 mb-1">Poliza para esta factura</p>
                <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin poliza" />
                  </SelectTrigger>
                  <SelectContent>
                    {patientPolicies.map((policy) => (
                      <SelectItem key={policy.id} value={policy.id}>
                        {policy.policyNumber} - {policy.providerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                size="sm"
                disabled={!canManageInvoices || assignInsurancePolicy.isPending}
                onClick={() => {
                  if (!canManageInvoices) {
                    toast.error(NO_PERMISSION_MESSAGE)
                    return
                  }

                  assignInsurancePolicy.mutate({
                    insurancePolicyId: selectedPolicyId || null,
                  })
                }}
              >
                Aplicar poliza
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={!canManageInvoices || assignInsurancePolicy.isPending}
                onClick={() => {
                  if (!canManageInvoices) {
                    toast.error(NO_PERMISSION_MESSAGE)
                    return
                  }

                  setSelectedPolicyId('')
                  assignInsurancePolicy.mutate({ insurancePolicyId: null })
                }}
              >
                Quitar poliza
              </Button>
            </div>
          ) : null}
        </section>

        <section className="rounded-md border border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Items facturados</h2>
            {isDraft && (
              <div className="ml-auto flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canManageInvoices || suggestItems.isPending}
                  onClick={() => {
                    if (!canManageInvoices) {
                      toast.error(NO_PERMISSION_MESSAGE)
                      return
                    }
                    suggestItems.mutate(invoice.id, {
                      onSuccess: () => setSuggestionsOpen(true),
                    })
                  }}
                >
                  {suggestItems.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      Sugerir items
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canManageInvoices || addInvoiceItem.isPending}
                  onClick={() => {
                    if (!canManageInvoices) {
                      toast.error(NO_PERMISSION_MESSAGE)
                      return
                    }
                    setItemDrawerOpen(true)
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Agregar item
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {invoice.items.map((item) => (
              <div
                key={item.id}
                className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-slate-800">{item.description}</p>
                  <p className="text-xs text-slate-500">
                    {item.quantity} x {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900">{formatCurrency(item.subtotal)}</p>
                  {isDraft ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={!canManageInvoices || removeInvoiceItem.isPending}
                      onClick={() => {
                        if (!canManageInvoices) {
                          toast.error(NO_PERMISSION_MESSAGE)
                          return
                        }

                        removeInvoiceItem.mutate(item.id)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Pagos registrados</h2>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-slate-500">No hay pagos registrados para esta factura.</p>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-800">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(payment.paymentDate)}</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Metodo: {PAYMENT_METHOD_LABELS[payment.paymentMethod]}
                    {payment.referenceNumber ? ` - Ref: ${payment.referenceNumber}` : ''}
                  </p>
                  {payment.notes && <p className="text-xs text-slate-500 mt-1">{payment.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <PaymentDrawer
        invoiceId={invoice.id}
        open={paymentDrawerOpen}
        onOpenChange={setPaymentDrawerOpen}
      />
      <InvoiceItemDrawer
        invoiceId={invoice.id}
        open={itemDrawerOpen}
        onOpenChange={setItemDrawerOpen}
      />

      {suggestItems.data && (
        <ItemSuggestionPanel
          invoiceId={invoice.id}
          result={suggestItems.data}
          open={suggestionsOpen}
          onOpenChange={setSuggestionsOpen}
        />
      )}
    </div>
  )
}
