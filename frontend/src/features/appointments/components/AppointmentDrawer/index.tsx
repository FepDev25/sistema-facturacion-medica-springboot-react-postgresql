import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  FormDescription,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useSearchPatients } from '@/features/patients/hooks/usePatients'
import { useDoctors } from '@/features/doctors/hooks/useDoctors'
import {
  AppointmentFormSchema,
  type AppointmentFormValues,
  getAvailability,
  getAppointmentById,
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
  const [patientQuery, setPatientQuery] = useState('')
  const [doctorQuery, setDoctorQuery] = useState('')

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(AppointmentFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const createAppointment = useCreateAppointment()
  const isPending = createAppointment.isPending

  const selectedDoctorId = form.watch('doctorId')
  const selectedScheduledAt = form.watch('scheduledAt')
  const selectedDuration = form.watch('durationMinutes')

  const availabilityRange = useMemo(() => {
    if (!selectedDoctorId || !selectedScheduledAt || !selectedDuration) {
      return null
    }

    const start = new Date(selectedScheduledAt)
    if (Number.isNaN(start.getTime())) {
      return null
    }

    const dayStart = new Date(start)
    dayStart.setHours(0, 0, 0, 0)

    const dayEnd = new Date(start)
    dayEnd.setHours(23, 59, 59, 999)

    return {
      from: dayStart.toISOString(),
      to: dayEnd.toISOString(),
      candidateStart: start,
      candidateEnd: new Date(start.getTime() + selectedDuration * 60 * 1000),
    }
  }, [selectedDoctorId, selectedScheduledAt, selectedDuration])

  const availabilityQuery = useQuery({
    queryKey: [
      'appointments',
      'availability',
      selectedDoctorId,
      availabilityRange?.from,
      availabilityRange?.to,
    ],
    queryFn: async () => {
      const occupied = await getAvailability(
        selectedDoctorId,
        availabilityRange?.from ?? '',
        availabilityRange?.to ?? '',
      )

      return Promise.all(occupied.map((slot) => getAppointmentById(slot.id)))
    },
    enabled: Boolean(selectedDoctorId && availabilityRange),
  })

  const hasScheduleConflict = useMemo(() => {
    if (!availabilityRange || !availabilityQuery.data) {
      return false
    }

    return availabilityQuery.data.some((slot) => {
      const slotStart = new Date(slot.scheduledAt)
      const slotEnd = new Date(slot.scheduledEndAt)

      return availabilityRange.candidateStart < slotEnd && availabilityRange.candidateEnd > slotStart
    })
  }, [availabilityQuery.data, availabilityRange])

  const { data: patientResults = [] } = useSearchPatients(patientQuery)

  const { data: doctors = [] } = useDoctors({ includeInactive: false })
  const matchedDoctors = useMemo(() => {
    const q = doctorQuery.trim().toLowerCase()
    if (q.length < 2) {
      return []
    }

    return doctors
      .filter(
        (doctor) =>
          doctor.firstName.toLowerCase().includes(q) ||
          doctor.lastName.toLowerCase().includes(q) ||
          doctor.specialty.toLowerCase().includes(q) ||
          doctor.licenseNumber.toLowerCase().includes(q),
      )
      .slice(0, 8)
  }, [doctorQuery, doctors])

  function onSubmit(values: AppointmentFormValues) {
    if (hasScheduleConflict) {
      return
    }

    createAppointment.mutate(toAppointmentCreateRequest(values), {
      onSuccess: () => {
        form.reset(DEFAULT_VALUES)
        setPatientQuery('')
        setDoctorQuery('')
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
          setPatientQuery('')
          setDoctorQuery('')
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
                    <FormLabel>Buscar paciente por DNI</FormLabel>
                    <FormControl>
                      <Input
                        value={patientQuery}
                        onChange={(event) => {
                          setPatientQuery(event.target.value)
                          field.onChange('')
                        }}
                        placeholder="Ej. 12345678"
                      />
                    </FormControl>
                    <FormDescription>
                      Escribe al menos 2 caracteres del DNI para buscar.
                    </FormDescription>
                    {field.value ? (
                      <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                        Paciente seleccionado:{' '}
                        {
                          patientResults.find((patient) => patient.id === field.value)
                            ?.firstName
                        }{' '}
                        {
                          patientResults.find((patient) => patient.id === field.value)
                            ?.lastName
                        }
                      </p>
                    ) : null}
                    {patientResults.length > 0 ? (
                      <div className="rounded-md border border-slate-200 overflow-hidden">
                        {patientResults.slice(0, 8).map((patient) => (
                          <button
                            key={patient.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                            onClick={() => {
                              field.onChange(patient.id)
                              setPatientQuery(patient.dni)
                            }}
                          >
                            {patient.firstName} {patient.lastName} ({patient.dni})
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="doctorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buscar médico por matrícula</FormLabel>
                    <FormControl>
                      <Input
                        value={doctorQuery}
                        onChange={(event) => {
                          setDoctorQuery(event.target.value)
                          field.onChange('')
                        }}
                        placeholder="Ej. MED-001-2015"
                      />
                    </FormControl>
                    <FormDescription>
                      Escribe al menos 2 caracteres de la matrícula.
                    </FormDescription>
                    {field.value ? (
                      <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                        Médico seleccionado:{' '}
                        {
                          doctors.find((doctor) => doctor.id === field.value)
                            ?.firstName
                        }{' '}
                        {
                          doctors.find((doctor) => doctor.id === field.value)
                            ?.lastName
                        }
                      </p>
                    ) : null}
                    {matchedDoctors.length > 0 ? (
                      <div className="rounded-md border border-slate-200 overflow-hidden">
                        {matchedDoctors.map((doctor) => (
                          <button
                            key={doctor.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                            onClick={() => {
                              field.onChange(doctor.id)
                              setDoctorQuery(doctor.licenseNumber)
                            }}
                          >
                            Dr. {doctor.firstName} {doctor.lastName} ({doctor.licenseNumber})
                          </button>
                        ))}
                      </div>
                    ) : null}
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
                          step={1}
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

              {availabilityQuery.isFetching ? (
                <p className="text-xs text-slate-500">Validando disponibilidad del medico...</p>
              ) : null}

              {hasScheduleConflict ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-xs text-red-700">
                    El medico ya tiene una cita en ese horario. Selecciona otra fecha u hora.
                  </p>
                </div>
              ) : null}

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
              <Button type="submit" disabled={isPending || hasScheduleConflict || availabilityQuery.isFetching}>
                {isPending ? 'Guardando...' : 'Crear cita'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
