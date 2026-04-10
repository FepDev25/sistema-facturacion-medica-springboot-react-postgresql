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
import { GENDER_LABELS } from '@/types/enums'
import {
  PatientFormSchema,
  type PatientFormValues,
  toPatientCreateRequest,
  toPatientUpdateRequest,
} from '../../api/patientsApi'
import { useCreatePatient, usePatient, useUpdatePatient } from '../../hooks/usePatients'

const DEFAULT_VALUES: PatientFormValues = {
  dni: '',
  firstName: '',
  lastName: '',
  birthDate: '',
  gender: 'female',
  phone: '',
  email: '',
  address: '',
  bloodType: '',
  allergies: '',
}

interface PatientDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId?: string | null
}

export function PatientDrawer({ open, onOpenChange, patientId }: PatientDrawerProps) {
  const isEditing = !!patientId
  const { data: patient } = usePatient(patientId ?? '')

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(PatientFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        patient
          ? {
              dni: patient.dni,
              firstName: patient.firstName,
              lastName: patient.lastName,
              birthDate: patient.birthDate,
              gender: patient.gender,
              phone: patient.phone,
              email: patient.email ?? '',
              address: patient.address ?? '',
              bloodType: patient.bloodType ?? '',
              allergies: patient.allergies ?? '',
            }
          : DEFAULT_VALUES,
      )
    }
  }, [open, patient, form])

  const createPatient = useCreatePatient()
  const updatePatient = useUpdatePatient()
  const isPending = createPatient.isPending || updatePatient.isPending

  function onSubmit(values: PatientFormValues) {
    if (isEditing && patientId) {
      updatePatient.mutate(
        {
          id: patientId,
          data: toPatientUpdateRequest(values),
        },
        {
          onSuccess: () => onOpenChange(false),
        },
      )
      return
    }

    createPatient.mutate(toPatientCreateRequest(values), {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-base">
            {isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}
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
                name="dni"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DNI</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="12345678"
                        className="font-mono"
                        disabled={isEditing}
                      />
                    </FormControl>
                    {isEditing && (
                      <p className="text-xs text-slate-400">El DNI no es editable</p>
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
                        <Input {...field} placeholder="María" />
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
                        <Input {...field} placeholder="González" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de nacimiento</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" disabled={isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Género</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.entries(GENDER_LABELS) as [string, string][]).map(
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
              </div>

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
                    <FormLabel>
                      Email <span className="text-slate-400 font-normal">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="paciente@email.com" />
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
                      Dirección <span className="text-slate-400 font-normal">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={2}
                        className="resize-none"
                        placeholder="Dirección completa"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bloodType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Tipo de sangre{' '}
                        <span className="text-slate-400 font-normal">(opcional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="O+" disabled={isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Alergias <span className="text-slate-400 font-normal">(opcional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Penicilina" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear paciente'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
