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
import {
  CompleteAppointmentFormSchema,
  type CompleteAppointmentFormValues,
  toMedicalRecordCreateRequest,
} from '@/features/medical-records/api/medicalRecordsApi'
import { useCompleteAppointment } from '../../hooks/useAppointments'

const DEFAULT_VALUES: CompleteAppointmentFormValues = {
  clinicalNotes: '',
  physicalExam: '',
  bloodPressure: '',
}

interface CompleteAppointmentDrawerProps {
  appointmentId: string
  patientId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CompleteAppointmentDrawer({
  appointmentId,
  patientId,
  open,
  onOpenChange,
}: CompleteAppointmentDrawerProps) {
  const form = useForm<CompleteAppointmentFormValues>({
    resolver: zodResolver(CompleteAppointmentFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (open) {
      form.reset(DEFAULT_VALUES)
    }
  }, [open, form])

  const completeAppointment = useCompleteAppointment()

  function onSubmit(values: CompleteAppointmentFormValues) {
    completeAppointment.mutate(
      {
        id: appointmentId,
        data: toMedicalRecordCreateRequest(appointmentId, patientId, values),
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-base">Completar cita</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
              <FormField
                control={form.control}
                name="clinicalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas clinicas</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={5} className="resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="physicalExam"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Examen fisico (opcional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} className="resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="bloodPressure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Presion arterial</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="120/80" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="heartRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frecuencia cardiaca</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ''}
                          onChange={(event) => {
                            const value = event.target.valueAsNumber
                            field.onChange(Number.isNaN(value) ? undefined : value)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperatura (C)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          value={field.value ?? ''}
                          onChange={(event) => {
                            const value = event.target.valueAsNumber
                            field.onChange(Number.isNaN(value) ? undefined : value)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="oxygenSaturation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Saturacion O2 (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ''}
                          onChange={(event) => {
                            const value = event.target.valueAsNumber
                            field.onChange(Number.isNaN(value) ? undefined : value)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          value={field.value ?? ''}
                          onChange={(event) => {
                            const value = event.target.valueAsNumber
                            field.onChange(Number.isNaN(value) ? undefined : value)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Talla (cm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ''}
                          onChange={(event) => {
                            const value = event.target.valueAsNumber
                            field.onChange(Number.isNaN(value) ? undefined : value)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="glucose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Glucosa (mg/dL)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ''}
                          onChange={(event) => {
                            const value = event.target.valueAsNumber
                            field.onChange(Number.isNaN(value) ? undefined : value)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <SheetFooter className="px-6 py-4 border-t flex flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={completeAppointment.isPending}>
                {completeAppointment.isPending ? 'Guardando...' : 'Completar cita'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
