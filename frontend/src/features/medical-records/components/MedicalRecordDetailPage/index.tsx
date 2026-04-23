import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BackToListButton } from '@/components/BackToListButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { DataTable } from '@/components/DataTable'
import { AllergyAlert } from '@/components/AllergyAlert'
import { formatDateTime } from '@/lib/utils'
import { useMedications } from '@/features/catalog/hooks/useCatalog'
import { usePatient } from '@/features/patients/hooks/usePatients'
import { Icd10Suggester } from '@/features/ai/components/Icd10Suggester'
import {
  DiagnosisFormSchema,
  type DiagnosisFormValues,
  PrescriptionFormSchema,
  type PrescriptionFormValues,
  ProcedureFormSchema,
  type ProcedureFormValues,
  toDiagnosisCreateRequest,
  toPrescriptionCreateRequest,
  toProcedureCreateRequest,
} from '../../api/medicalRecordsApi'
import {
  useAddDiagnosis,
  useAddPrescription,
  useAddProcedure,
  useMedicalRecord,
  useMedicalRecordDiagnoses,
  useMedicalRecordPrescriptions,
  useMedicalRecordProcedures,
} from '../../hooks/useMedicalRecords'

export function MedicalRecordDetailPage() {
  const { id } = useParams({ from: '/medical-records/$id' })

  const medicalRecordQuery = useMedicalRecord(id)
  const diagnosesQuery = useMedicalRecordDiagnoses(id)
  const prescriptionsQuery = useMedicalRecordPrescriptions(id)
  const proceduresQuery = useMedicalRecordProcedures(id)

  const addDiagnosis = useAddDiagnosis(id)
  const addPrescription = useAddPrescription(id)
  const addProcedure = useAddProcedure(id)
  const { data: medications = [] } = useMedications()
  const patientQuery = usePatient(medicalRecordQuery.data?.patientId ?? '')

  const [diagnosisOpen, setDiagnosisOpen] = useState(false)
  const [prescriptionOpen, setPrescriptionOpen] = useState(false)
  const [procedureOpen, setProcedureOpen] = useState(false)

  const diagnosisForm = useForm<DiagnosisFormValues>({
    resolver: zodResolver(DiagnosisFormSchema),
    defaultValues: {
      icd10Code: '',
      description: '',
      diagnosedAt: new Date().toISOString().slice(0, 16),
    },
  })

  const prescriptionForm = useForm<PrescriptionFormValues>({
    resolver: zodResolver(PrescriptionFormSchema),
    defaultValues: {
      medicationId: '',
      dosage: '',
      frequency: '',
      durationDays: 1,
      instructions: '',
    },
  })

  const procedureForm = useForm<ProcedureFormValues>({
    resolver: zodResolver(ProcedureFormSchema),
    defaultValues: {
      procedureCode: '',
      description: '',
      notes: '',
      performedAt: new Date().toISOString().slice(0, 16),
    },
  })

  if (medicalRecordQuery.isLoading) {
    return <div className="px-6 py-8 text-sm text-slate-500">Cargando expediente...</div>
  }

  const record = medicalRecordQuery.data
  if (!record) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-slate-500 mb-4">No se encontro el expediente.</p>
        <BackToListButton fallbackTo="/patients" label="Volver a pacientes" />
      </div>
    )
  }

  const appointmentId = record.appointmentId

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Expediente clinico</h1>
            <p className="text-sm text-slate-500 mt-0.5">Registro {record.id}</p>
          </div>
          <BackToListButton fallbackTo="/patients" label="Volver a pacientes" />
        </div>
      </div>

      <div className="flex-1 px-6 py-5 overflow-auto space-y-6">
        <AllergyAlert
          allergies={patientQuery.data?.allergies}
          patientName={`${record.patientFirstName} ${record.patientLastName}`}
        />

        <section className="rounded-md border border-border bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Resumen</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Paciente</p>
              <p className="text-sm text-slate-800">
                {record.patientFirstName} {record.patientLastName}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Fecha de registro</p>
              <p className="text-sm text-slate-800">{formatDateTime(record.recordDate)}</p>
            </div>
            <div className="md:col-span-2 lg:col-span-2">
              <p className="text-xs text-slate-500">Notas clinicas</p>
              <p className="text-sm text-slate-800">{record.clinicalNotes}</p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-border bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Diagnosticos</h2>
            <Dialog open={diagnosisOpen} onOpenChange={setDiagnosisOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  Agregar diagnostico
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo diagnostico</DialogTitle>
                </DialogHeader>
                <Form {...diagnosisForm}>
                  <form
                    className="space-y-3"
                    onSubmit={diagnosisForm.handleSubmit((values) => {
                      addDiagnosis.mutate(toDiagnosisCreateRequest(appointmentId, id, values), {
                        onSuccess: () => {
                          setDiagnosisOpen(false)
                          diagnosisForm.reset({
                            icd10Code: '',
                            description: '',
                            diagnosedAt: new Date().toISOString().slice(0, 16),
                          })
                        },
                      })
                    })}
                  >
                    <Icd10Suggester
                      onSelect={(code, description) => {
                        diagnosisForm.setValue('icd10Code', code)
                        diagnosisForm.setValue('description', description)
                      }}
                    />
                    <FormField
                      control={diagnosisForm.control}
                      name="icd10Code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Codigo ICD-10</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="J02.9" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={diagnosisForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripcion</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} className="resize-none" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={diagnosisForm.control}
                      name="severity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Severidad (opcional)</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sin severidad" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="mild">Leve</SelectItem>
                              <SelectItem value="moderate">Moderado</SelectItem>
                              <SelectItem value="severe">Severo</SelectItem>
                              <SelectItem value="critical">Critico</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={diagnosisForm.control}
                      name="diagnosedAt"
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
                    <Button type="submit" disabled={addDiagnosis.isPending}>
                      Guardar
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <DataTable
            columns={[
              { accessorKey: 'icd10Code', header: 'Codigo' },
              { accessorKey: 'description', header: 'Descripcion' },
              {
                accessorKey: 'severity',
                header: 'Severidad',
                cell: ({ row }) => row.original.severity ?? '—',
              },
              {
                accessorKey: 'diagnosedAt',
                header: 'Fecha',
                cell: ({ row }) => formatDateTime(row.original.diagnosedAt),
              },
            ]}
            data={diagnosesQuery.data ?? []}
            isLoading={diagnosesQuery.isLoading}
            pageSize={5}
            emptyMessage="Sin diagnosticos registrados."
          />
        </section>

        <section className="rounded-md border border-border bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Prescripciones</h2>
            <Dialog open={prescriptionOpen} onOpenChange={setPrescriptionOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  Agregar prescripcion
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva prescripcion</DialogTitle>
                </DialogHeader>
                <Form {...prescriptionForm}>
                  <form
                    className="space-y-3"
                    onSubmit={prescriptionForm.handleSubmit((values) => {
                      addPrescription.mutate(
                        toPrescriptionCreateRequest(appointmentId, id, values),
                        {
                          onSuccess: () => {
                            setPrescriptionOpen(false)
                            prescriptionForm.reset({
                              medicationId: '',
                              dosage: '',
                              frequency: '',
                              durationDays: 1,
                              instructions: '',
                            })
                          },
                        },
                      )
                    })}
                  >
                    <FormField
                      control={prescriptionForm.control}
                      name="medicationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medicamento</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
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
                    <FormField
                      control={prescriptionForm.control}
                      name="dosage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dosis</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="500 mg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={prescriptionForm.control}
                      name="frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frecuencia</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Cada 8 horas" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={prescriptionForm.control}
                      name="durationDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duracion (dias)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={365}
                              value={field.value}
                              onChange={(event) => field.onChange(event.target.valueAsNumber)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={prescriptionForm.control}
                      name="instructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instrucciones (opcional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} className="resize-none" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={addPrescription.isPending}>
                      Guardar
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <DataTable
            columns={[
              { accessorKey: 'medicationName', header: 'Medicamento' },
              { accessorKey: 'dosage', header: 'Dosis' },
              { accessorKey: 'frequency', header: 'Frecuencia' },
              { accessorKey: 'durationDays', header: 'Dias' },
              {
                accessorKey: 'createdAt',
                header: 'Creada',
                cell: ({ row }) => formatDateTime(row.original.createdAt),
              },
            ]}
            data={prescriptionsQuery.data ?? []}
            isLoading={prescriptionsQuery.isLoading}
            pageSize={5}
            emptyMessage="Sin prescripciones registradas."
          />
        </section>

        <section className="rounded-md border border-border bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Procedimientos</h2>
            <Dialog open={procedureOpen} onOpenChange={setProcedureOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  Agregar procedimiento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo procedimiento</DialogTitle>
                </DialogHeader>
                <Form {...procedureForm}>
                  <form
                    className="space-y-3"
                    onSubmit={procedureForm.handleSubmit((values) => {
                      addProcedure.mutate(toProcedureCreateRequest(appointmentId, id, values), {
                        onSuccess: () => {
                          setProcedureOpen(false)
                          procedureForm.reset({
                            procedureCode: '',
                            description: '',
                            notes: '',
                            performedAt: new Date().toISOString().slice(0, 16),
                          })
                        },
                      })
                    })}
                  >
                    <FormField
                      control={procedureForm.control}
                      name="procedureCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Codigo</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="PROC-001" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={procedureForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripcion</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} className="resize-none" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={procedureForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notas (opcional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} className="resize-none" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={procedureForm.control}
                      name="performedAt"
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
                    <Button type="submit" disabled={addProcedure.isPending}>
                      Guardar
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <DataTable
            columns={[
              { accessorKey: 'procedureCode', header: 'Codigo' },
              { accessorKey: 'description', header: 'Descripcion' },
              {
                accessorKey: 'performedAt',
                header: 'Realizado',
                cell: ({ row }) => formatDateTime(row.original.performedAt),
              },
            ]}
            data={proceduresQuery.data ?? []}
            isLoading={proceduresQuery.isLoading}
            pageSize={5}
            emptyMessage="Sin procedimientos registrados."
          />
        </section>
      </div>
    </div>
  )
}
