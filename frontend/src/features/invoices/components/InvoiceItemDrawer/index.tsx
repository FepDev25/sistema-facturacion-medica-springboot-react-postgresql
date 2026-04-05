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
import { ITEM_TYPE_LABELS } from '@/types/invoice'
import { useMedications, useServices } from '@/features/catalog/hooks/useCatalog'
import {
  InvoiceItemFormSchema,
  type InvoiceItemFormValues,
  toInvoiceItemRequest,
} from '../../api/invoicesApi'
import { useAddInvoiceItem } from '../../hooks/useInvoices'

const DEFAULT_VALUES: InvoiceItemFormValues = {
  itemType: 'service',
  serviceId: '',
  medicationId: '',
  description: '',
  quantity: 1,
  unitPrice: 0,
}

interface InvoiceItemDrawerProps {
  invoiceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvoiceItemDrawer({ invoiceId, open, onOpenChange }: InvoiceItemDrawerProps) {
  const form = useForm<InvoiceItemFormValues>({
    resolver: zodResolver(InvoiceItemFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const itemType = form.watch('itemType')

  const { data: services = [] } = useServices()
  const { data: medications = [] } = useMedications()

  const addItem = useAddInvoiceItem(invoiceId)

  useEffect(() => {
    if (open) {
      form.reset(DEFAULT_VALUES)
    }
  }, [open, form])

  const quantity = form.watch('quantity')
  const unitPrice = form.watch('unitPrice')
  const subtotal =
    Number.isFinite(quantity) && Number.isFinite(unitPrice)
      ? (quantity * unitPrice).toFixed(2)
      : '0.00'

  function onSubmit(values: InvoiceItemFormValues) {
    addItem.mutate(toInvoiceItemRequest(values), {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-base">Agregar item</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
              <FormField
                control={form.control}
                name="itemType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de item</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value)
                        form.setValue('serviceId', '')
                        form.setValue('medicationId', '')
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(ITEM_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {itemType === 'service' ? (
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Servicio</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                          const selected = services.find((service) => service.id === value)
                          if (selected) {
                            form.setValue('description', selected.name)
                            form.setValue('unitPrice', selected.price)
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar servicio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.code} - {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              {itemType === 'medication' ? (
                <FormField
                  control={form.control}
                  name="medicationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medicamento</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                          const selected = medications.find((medication) => medication.id === value)
                          if (selected) {
                            form.setValue('description', selected.name)
                            form.setValue('unitPrice', selected.price)
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar medicamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {medications.map((medication) => (
                            <SelectItem key={medication.id} value={medication.id}>
                              {medication.code} - {medication.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripcion</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Detalle del item" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio unitario</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Subtotal estimado: <span className="font-medium">${subtotal}</span>
              </div>
            </div>

            <SheetFooter className="px-6 py-4 border-t flex flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addItem.isPending}>
                {addItem.isPending ? 'Guardando...' : 'Agregar item'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
