import { useEffect, useState } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { useSearchPatients } from '@/features/patients/hooks/usePatients'
import type { InsurancePolicyResponse } from '@/types/insurance'
import {
  PolicyFormSchema,
  type PolicyFormValues,
  toPolicyRequest,
  toPolicyUpdateRequest,
} from '../../api/insuranceApi'
import { useCreatePolicy, useProviders, useUpdatePolicy } from '../../hooks/useInsurance'

const DEFAULT_VALUES: PolicyFormValues = {
  patientId: '',
  providerId: '',
  policyNumber: '',
  coveragePercentage: 80,
  deductible: 0,
  startDate: '',
  endDate: '',
  isActive: true,
}

interface PolicyDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: InsurancePolicyResponse | null
}

export function PolicyDrawer({ open, onOpenChange, item }: PolicyDrawerProps) {
  const isEditing = !!item
  const [patientQuery, setPatientQuery] = useState('')

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(PolicyFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const { data: providers = [] } = useProviders({ includeInactive: false })
  const { data: patientResults = [] } = useSearchPatients(patientQuery)
  const createPolicy = useCreatePolicy()
  const updatePolicy = useUpdatePolicy()
  const isPending = createPolicy.isPending || updatePolicy.isPending

  const patients = patientResults.map((patient) => ({
    id: patient.id,
    label: `${patient.firstName} ${patient.lastName} (${patient.dni})`,
  }))

  useEffect(() => {
    if (open) {
      form.reset(
        item
          ? {
              patientId: item.patientId,
              providerId: item.providerId,
              policyNumber: item.policyNumber,
              coveragePercentage: item.coveragePercentage,
              deductible: item.deductible,
              startDate: item.startDate,
              endDate: item.endDate,
              isActive: item.isActive,
            }
          : DEFAULT_VALUES,
      )
    }
  }, [open, item, form])

  function onSubmit(values: PolicyFormValues) {
    if (isEditing && item) {
      updatePolicy.mutate(
        { id: item.id, data: toPolicyUpdateRequest(values, values.isActive) },
        { onSuccess: () => onOpenChange(false) },
      )
      return
    }

    createPolicy.mutate(toPolicyRequest(values), {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-base">{isEditing ? 'Editar Poliza' : 'Nueva Poliza'}</SheetTitle>
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
                    <Input
                      placeholder="Buscar por nombre o DNI..."
                      value={patientQuery}
                      onChange={(e) => {
                        setPatientQuery(e.target.value)
                        if (field.value && !e.target.value) {
                          field.onChange('')
                        }
                      }}
                    />
                    {patientResults.length > 0 && (
                      <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-slate-200">
                        {patientResults.map((patient) => (
                          <button
                            key={patient.id}
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            onClick={() => {
                              field.onChange(patient.id)
                              setPatientQuery(`${patient.firstName} ${patient.lastName}`)
                            }}
                          >
                            {patient.firstName} {patient.lastName} ({patient.dni})
                          </button>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="providerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aseguradora</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar aseguradora" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name} ({provider.code})
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
                name="policyNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numero de poliza</FormLabel>
                    <FormControl>
                      <Input {...field} className="font-mono" placeholder="POL-2026-001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="coveragePercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cobertura (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
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

                <FormField
                  control={form.control}
                  name="deductible"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deducible</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inicio</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fin</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
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
                        <FormLabel className="cursor-pointer">Poliza activa</FormLabel>
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
                {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear poliza'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
