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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { InsuranceProviderResponse } from '@/types/insurance'
import {
  ProviderFormSchema,
  type ProviderFormValues,
  toProviderCreateRequest,
  toProviderUpdateRequest,
} from '../../api/insuranceApi'
import { useCreateProvider, useUpdateProvider } from '../../hooks/useInsurance'

const DEFAULT_VALUES: ProviderFormValues = {
  name: '',
  code: '',
  phone: '',
  email: '',
  address: '',
}

interface ProviderDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: InsuranceProviderResponse | null
}

export function ProviderDrawer({ open, onOpenChange, item }: ProviderDrawerProps) {
  const isEditing = !!item

  const form = useForm<ProviderFormValues>({
    resolver: zodResolver(ProviderFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        item
          ? {
              name: item.name,
              code: item.code,
              phone: item.phone,
              email: item.email ?? '',
              address: item.address ?? '',
            }
          : DEFAULT_VALUES,
      )
    }
  }, [open, item, form])

  const createProvider = useCreateProvider()
  const updateProvider = useUpdateProvider()
  const isPending = createProvider.isPending || updateProvider.isPending

  function onSubmit(values: ProviderFormValues) {
    if (isEditing && item) {
      updateProvider.mutate(
        { id: item.id, data: toProviderUpdateRequest(values) },
        { onSuccess: () => onOpenChange(false) },
      )
      return
    }

    createProvider.mutate(toProviderCreateRequest(values), {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-base">
            {isEditing ? 'Editar Aseguradora' : 'Nueva Aseguradora'}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codigo</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="font-mono uppercase"
                        placeholder="SEG-001"
                        disabled={isEditing}
                      />
                    </FormControl>
                    {isEditing && (
                      <p className="text-xs text-slate-400">El codigo no es editable</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Aseguradora Nacional" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+52-800-000-0000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email <span className="text-slate-400 font-normal">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="contacto@seguro.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Direccion <span className="text-slate-400 font-normal">(opcional)</span>
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
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear aseguradora'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
