import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { SERVICE_CATEGORY_LABELS } from '@/types/enums'
import type { ServiceResponse } from '@/types/catalog'
import { ServiceFormSchema, type ServiceFormValues } from '../../api/catalogApi'
import { useCreateService, useUpdateService } from '../../hooks/useCatalog'

interface ServiceDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: ServiceResponse | null
}

export function ServiceDrawer({ open, onOpenChange, item }: ServiceDrawerProps) {
  const isEditing = !!item

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(ServiceFormSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      price: 0,
      category: 'consultation',
      isActive: true,
    },
  })

  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          code: item.code,
          name: item.name,
          description: item.description ?? '',
          price: item.price,
          category: item.category,
          isActive: item.isActive,
        })
      } else {
        form.reset({
          code: '',
          name: '',
          description: '',
          price: 0,
          category: 'consultation',
          isActive: true,
        })
      }
    }
  }, [open, item, form])

  const createService = useCreateService()
  const updateService = useUpdateService()

  const isPending = createService.isPending || updateService.isPending

  function onSubmit(values: ServiceFormValues) {
    if (isEditing && item) {
      const { code: _code, ...updateData } = values
      updateService.mutate(
        { id: item.id, data: { ...updateData, description: updateData.description || null } },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createService.mutate(
        { ...values, description: values.description || null },
        { onSuccess: () => onOpenChange(false) },
      )
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-base">
            {isEditing ? 'Editar Servicio' : 'Nuevo Servicio'}
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
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="CONS-001"
                        className="font-mono uppercase"
                        disabled={isEditing}
                      />
                    </FormControl>
                    {isEditing && (
                      <p className="text-xs text-slate-400">El código no es editable</p>
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
                      <Input {...field} placeholder="Consulta Medicina General" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Descripción{' '}
                      <span className="text-slate-400 font-normal">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Descripción breve del servicio"
                        rows={3}
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio (MXN)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder="0.00"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(
                            Object.entries(SERVICE_CATEGORY_LABELS) as [string, string][]
                          ).map(([value, label]) => (
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
              </div>

              {isEditing ? (
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-3">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div>
                        <FormLabel className="cursor-pointer">Servicio activo</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              ) : null}
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
                {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear servicio'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
