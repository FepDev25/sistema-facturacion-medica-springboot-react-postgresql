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
import { Checkbox } from '@/components/ui/checkbox'
import type { DoctorResponse } from '@/types/doctor'
import {
  DoctorFormSchema,
  type DoctorFormValues,
  toDoctorCreateRequest,
  toDoctorUpdateRequest,
} from '../../api/doctorsApi'
import { useCreateDoctor, useUpdateDoctor } from '../../hooks/useDoctors'

const DEFAULT_VALUES: DoctorFormValues = {
  licenseNumber: '',
  firstName: '',
  lastName: '',
  specialty: '',
  phone: '',
  email: '',
  isActive: true,
}

interface DoctorDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: DoctorResponse | null
}

export function DoctorDrawer({ open, onOpenChange, item }: DoctorDrawerProps) {
  const isEditing = !!item

  const form = useForm<DoctorFormValues>({
    resolver: zodResolver(DoctorFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        item
          ? {
              licenseNumber: item.licenseNumber,
              firstName: item.firstName,
              lastName: item.lastName,
              specialty: item.specialty,
              phone: item.phone,
              email: item.email,
              isActive: item.isActive,
            }
          : DEFAULT_VALUES,
      )
    }
  }, [open, item, form])

  const createDoctor = useCreateDoctor()
  const updateDoctor = useUpdateDoctor()
  const isPending = createDoctor.isPending || updateDoctor.isPending

  function onSubmit(values: DoctorFormValues) {
    if (isEditing && item) {
      updateDoctor.mutate(
        {
          id: item.id,
          data: toDoctorUpdateRequest(values, values.isActive),
        },
        {
          onSuccess: () => onOpenChange(false),
        },
      )
      return
    }

    createDoctor.mutate(toDoctorCreateRequest(values), {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-base">
            {isEditing ? 'Editar Médico' : 'Nuevo Médico'}
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
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de licencia</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="MED-123-2020"
                        className="font-mono"
                        disabled={isEditing}
                      />
                    </FormControl>
                    {isEditing && (
                      <p className="text-xs text-slate-400">La licencia no es editable</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Fernando" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="García" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especialidad</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Medicina General" />
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
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+52-555-1234-5678" />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="doctor@hospital.com" />
                    </FormControl>
                    <FormMessage />
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
                        <FormLabel className="cursor-pointer">Medico activo</FormLabel>
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
                {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear médico'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
