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
import { MEDICATION_UNIT_LABELS } from '@/types/enums'
import type { MedicationResponse } from '@/types/catalog'
import { MedicationFormSchema, type MedicationFormValues } from '../../api/catalogApi'
import { useCreateMedication, useUpdateMedication } from '../../hooks/useCatalog'

interface MedicationDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: MedicationResponse | null
}

export function MedicationDrawer({ open, onOpenChange, item }: MedicationDrawerProps) {
  const isEditing = !!item

  const form = useForm<MedicationFormValues>({
    resolver: zodResolver(MedicationFormSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      price: 0,
      unit: 'tablet',
      requiresPrescription: false,
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
          unit: item.unit,
          requiresPrescription: item.requiresPrescription,
          isActive: item.isActive,
        })
      } else {
        form.reset({
          code: '',
          name: '',
          description: '',
          price: 0,
          unit: 'tablet',
          requiresPrescription: false,
          isActive: true,
        })
      }
    }
  }, [open, item, form])

  const createMedication = useCreateMedication()
  const updateMedication = useUpdateMedication()

  const isPending = createMedication.isPending || updateMedication.isPending

  function onSubmit(values: MedicationFormValues) {
    if (isEditing && item) {
      const { code: _code, ...updateData } = values
      updateMedication.mutate(
        { id: item.id, data: { ...updateData, description: updateData.description || null } },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createMedication.mutate(
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
            {isEditing ? 'Editar Medicamento' : 'Nuevo Medicamento'}
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
                        placeholder="MED-001"
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
                      <Input {...field} placeholder="Amoxicilina 500mg" />
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
                        placeholder="Descripción del medicamento"
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
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidad</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(
                            Object.entries(MEDICATION_UNIT_LABELS) as [string, string][]
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

              <FormField
                control={form.control}
                name="requiresPrescription"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div>
                      <FormLabel className="cursor-pointer">Requiere receta médica</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

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
                        <FormLabel className="cursor-pointer">Medicamento activo</FormLabel>
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
                {isPending
                  ? 'Guardando...'
                  : isEditing
                    ? 'Guardar cambios'
                    : 'Crear medicamento'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
