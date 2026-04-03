import { useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, CreditCard, FileText, Shield, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/types/enums'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { useInvoice, useInvoicePayments } from '../../hooks/useInvoices'
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
  const { id } = useParams({ from: '/invoices/$id' })
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false)

  const invoiceQuery = useInvoice(id)
  const paymentsQuery = useInvoicePayments(id)

  if (invoiceQuery.isLoading) {
    return <div className="px-6 py-8 text-sm text-slate-500">Cargando factura...</div>
  }

  const invoice = invoiceQuery.data
  if (!invoice) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-slate-500 mb-4">No se encontro la factura.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/invoices">
            <ArrowLeft className="h-4 w-4" />
            Volver a facturas
          </Link>
        </Button>
      </div>
    )
  }

  const payments = paymentsQuery.data ?? []

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{invoice.invoiceNumber}</h1>
            <p className="text-sm text-slate-500 mt-0.5">Detalle de factura y cobranza</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setPaymentDrawerOpen(true)}>
              Registrar pago
            </Button>
            <Button asChild variant="outline" size="sm" aria-label="Volver a facturas">
              <Link to="/invoices">
                <ArrowLeft className="h-4 w-4" />
                Volver a facturas
              </Link>
            </Button>
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

        <section className="rounded-md border border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <UserRound className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Paciente y cobertura</h2>
          </div>
          <p className="text-sm text-slate-800">
            {invoice.patient.firstName} {invoice.patient.lastName}
          </p>
          <p className="text-xs text-slate-500 mt-1">DNI: {invoice.patient.dni}</p>
          {invoice.insurancePolicy ? (
            <p className="text-xs text-slate-500 mt-1">
              Poliza {invoice.insurancePolicy.policyNumber} - {invoice.insurancePolicy.providerName} ({' '}
              {invoice.insurancePolicy.coveragePercentage}% cobertura)
            </p>
          ) : (
            <p className="text-xs text-slate-500 mt-1">Sin seguro aplicado</p>
          )}
        </section>

        <section className="rounded-md border border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Items facturados</h2>
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
                <p className="text-sm font-medium text-slate-900">{formatCurrency(item.subtotal)}</p>
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

        {invoice.appointment && (
          <section className="rounded-md border border-border bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">Contexto clínico</h2>
            </div>
            <p className="text-sm text-slate-800">{invoice.appointment.chiefComplaint}</p>
            <p className="text-xs text-slate-500 mt-1">
              Cita del {formatDateTime(invoice.appointment.scheduledAt)}
            </p>
          </section>
        )}
      </div>

      <PaymentDrawer
        invoiceId={invoice.id}
        open={paymentDrawerOpen}
        onOpenChange={setPaymentDrawerOpen}
      />
    </div>
  )
}
