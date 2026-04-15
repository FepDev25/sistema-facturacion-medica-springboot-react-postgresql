import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PAYMENT_METHOD_LABELS } from '@/types/enums'
import { formatCurrency } from '@/lib/utils'
import {
  PaymentFormSchema,
  type PaymentFormValues,
  toPaymentCreateRequest,
} from '../../api/invoicesApi'
import { useInvoice, useInvoicePayments } from '../../hooks/useInvoices'

function getLocalDateTimeString(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

const DEFAULT_VALUES: PaymentFormValues = {
  amount: 0,
  paymentMethod: 'cash',
  referenceNumber: '',
  notes: '',
  paymentDate: '',
}

interface PaymentDrawerProps {
  invoiceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentDrawer({ invoiceId, open, onOpenChange }: PaymentDrawerProps) {
  const { data: invoice } = useInvoice(invoiceId)
  const { data: payments = [] } = useInvoicePayments(invoiceId)

  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0)
  const balance = invoice ? Math.max(invoice.patientResponsibility - totalPaid, 0) : 0

  const paymentFormSchema = PaymentFormSchema.refine(
    (data) => data.amount <= balance,
    { path: ['amount'], message: `El monto no puede exceder el saldo pendiente (${formatCurrency(balance)})` },
  )

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (open) {
      form.reset({
        ...DEFAULT_VALUES,
        paymentDate: getLocalDateTimeString(),
      })
    }
  }, [open, form])

  const registerPayment = useRegisterPayment(invoiceId)

  function onSubmit(values: PaymentFormValues) {
    registerPayment.mutate(toPaymentCreateRequest(invoiceId, values), {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-base">Registrar pago</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Responsabilidad paciente:</span>
                  <span className="font-medium text-slate-800">
                    {invoice ? formatCurrency(invoice.patientResponsibility) : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total pagado:</span>
                  <span className="font-medium text-slate-800">{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="text-slate-700 font-medium">Saldo pendiente:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(balance)}</span>
                </div>
              </div>

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0.01}
                        max={balance > 0 ? balance : undefined}
                        step={0.01}
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.valueAsNumber)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                    {balance > 0 ? (
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => form.setValue('amount', Number(balance.toFixed(2)), { shouldValidate: true })}
                      >
                        Pagar total ({formatCurrency(balance)})
                      </button>
                    ) : null}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metodo de pago</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar metodo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.entries(PAYMENT_METHOD_LABELS) as [string, string][]).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha y hora</FormLabel>
                    <FormControl>
                      <Input {...field} type="datetime-local" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Referencia <span className="text-slate-400 font-normal">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="TXN-12345" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Notas <span className="text-slate-400 font-normal">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} className="resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter className="px-6 py-4 border-t flex flex-row justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={registerPayment.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={registerPayment.isPending}>
                {registerPayment.isPending ? 'Guardando...' : 'Registrar pago'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
