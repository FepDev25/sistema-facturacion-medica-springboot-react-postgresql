import { useMemo } from 'react'
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
import { DOCTORS_MOCK, PATIENTS_MOCK } from '@/mocks'
import {
  AppointmentFormSchema,
  type AppointmentFormValues,
  toAppointmentCreateRequest,
} from '../../api/appointmentsApi'
import { useCreateAppointment } from '../../hooks/useAppointments'

const DEFAULT_VALUES: AppointmentFormValues = {
  patientId: '',
  doctorId: '',
  scheduledAt: '',
  durationMinutes: 30,
  chiefComplaint: '',
  notes: '',
}

interface AppointmentDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppointmentDrawer({ open, onOpenChange }: AppointmentDrawerProps) {
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(AppointmentFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const createAppointment = useCreateAppointment()
  const isPending = createAppointment.isPending

  const activeDoctors = useMemo(
    () => DOCTORS_MOCK.filter((doctor) => doctor.isActive),
    [],
  )

  function onSubmit(values: AppointmentFormValues) {
    createAppointment.mutate(toAppointmentCreateRequest(values), {
      onSuccess: () => {
        form.reset(DEFAULT_VALUES)
        onOpenChange(false)
      },
    })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (nextOpen) {
          form.reset(DEFAULT_VALUES)
        }
      }}
    >
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-base">Nueva Cita</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paciente</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar paciente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PATIENTS_MOCK.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.firstName} {patient.lastName} ({patient.dni})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="doctorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Médico</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar médico" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeDoctors.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            Dr. {doctor.firstName} {doctor.lastName} ({doctor.specialty})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="scheduledAt"
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
                  name="durationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duración (min)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          step={5}
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.valueAsNumber)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="chiefComplaint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo de consulta</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        className="resize-none"
                        placeholder="Motivo principal de la cita"
                      />
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
                      <Textarea
                        {...field}
                        rows={2}
                        className="resize-none"
                        placeholder="Notas administrativas o clínicas"
                      />
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
                {isPending ? 'Guardando...' : 'Crear cita'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
