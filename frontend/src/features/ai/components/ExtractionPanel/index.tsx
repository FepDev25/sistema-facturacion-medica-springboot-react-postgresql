import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { ExtractionResult } from '@/types/ai'
import type { Severity } from '@/types'
import * as medicalRecordsApi from '@/features/medical-records/api/medicalRecordsApi'
import { medicalRecordKeys } from '@/features/medical-records/hooks/useMedicalRecords'

interface ExtractionPanelProps {
  result: ExtractionResult
  open: boolean
  onOpenChange: (open: boolean) => void
  medicalRecordId: string
  appointmentId: string
}

export function ExtractionPanel({
  result,
  open,
  onOpenChange,
  medicalRecordId,
  appointmentId,
}: ExtractionPanelProps) {
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<Set<number>>(new Set())
  const [selectedPrescriptions, setSelectedPrescriptions] = useState<Set<number>>(new Set())
  const [selectedProcedures, setSelectedProcedures] = useState<Set<number>>(new Set())

  useEffect(() => {
    setSelectedDiagnoses(new Set(result.diagnoses.map((_, i) => i)))
    setSelectedPrescriptions(
      new Set(
        result.prescriptions
          .map((p, i) => (p.matchedMedicationId !== null ? i : -1))
          .filter((i) => i >= 0),
      ),
    )
    setSelectedProcedures(new Set(result.procedures.map((_, i) => i)))
  }, [result])

  function toggle(
    set: Set<number>,
    setter: React.Dispatch<React.SetStateAction<Set<number>>>,
    idx: number,
  ) {
    const next = new Set(set)
    if (next.has(idx)) next.delete(idx)
    else next.add(idx)
    setter(next)
  }

  const totalSelected =
    selectedDiagnoses.size + selectedPrescriptions.size + selectedProcedures.size
  const totalItems =
    result.diagnoses.length + result.prescriptions.length + result.procedures.length

  async function handleApply() {
    setSaving(true)
    const tasks: Promise<unknown>[] = []

    selectedDiagnoses.forEach((i) => {
      const d = result.diagnoses[i]
      tasks.push(
        medicalRecordsApi.addDiagnosis(medicalRecordId, {
          appointmentId,
          medicalRecordId,
          icd10Code: d.icd10Code,
          description: d.description,
          severity: (d.severity?.toLowerCase() as Severity | undefined) ?? null,
          diagnosedAt: new Date().toISOString(),
        }),
      )
    })

    selectedPrescriptions.forEach((i) => {
      const p = result.prescriptions[i]
      if (!p.matchedMedicationId) return
      tasks.push(
        medicalRecordsApi.addPrescription(medicalRecordId, {
          appointmentId,
          medicalRecordId,
          medicationId: p.matchedMedicationId,
          dosage: p.dosage,
          frequency: p.frequency,
          durationDays: p.durationDays,
          instructions: p.instructions,
        }),
      )
    })

    selectedProcedures.forEach((i) => {
      const proc = result.procedures[i]
      tasks.push(
        medicalRecordsApi.addProcedure(medicalRecordId, {
          appointmentId,
          medicalRecordId,
          procedureCode: proc.code,
          description: proc.description,
          notes: proc.notes,
          performedAt: new Date().toISOString(),
        }),
      )
    })

    const results = await Promise.allSettled(tasks)
    const failed = results.filter((r) => r.status === 'rejected').length
    const succeeded = results.filter((r) => r.status === 'fulfilled').length

    if (succeeded > 0) {
      void qc.invalidateQueries({ queryKey: medicalRecordKeys.diagnoses(medicalRecordId) })
      void qc.invalidateQueries({ queryKey: medicalRecordKeys.prescriptions(medicalRecordId) })
      void qc.invalidateQueries({ queryKey: medicalRecordKeys.procedures(medicalRecordId) })
      toast.success(
        `${succeeded} elemento${succeeded !== 1 ? 's' : ''} guardado${succeeded !== 1 ? 's' : ''} correctamente.`,
      )
    }
    if (failed > 0) {
      toast.error(`${failed} elemento${failed !== 1 ? 's' : ''} no se pudo${failed !== 1 ? 'eron' : ''} guardar.`)
    }

    setSaving(false)
    if (failed === 0) onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg gap-0 p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-4 border-b pr-12">
          <SheetTitle>Extracción de notas clínicas</SheetTitle>
          <SheetDescription>
            Selecciona los elementos que deseas guardar en el expediente.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-5 py-4">
          {totalItems === 0 ? (
            <p className="text-sm text-slate-500">
              No se encontraron elementos para extraer de las notas clínicas.
            </p>
          ) : (
            <div className="space-y-5">
              {result.diagnoses.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Diagnósticos ({result.diagnoses.length})
                  </h3>
                  <div className="space-y-2">
                    {result.diagnoses.map((d, i) => (
                      <label
                        key={i}
                        className="flex items-start gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 cursor-pointer hover:bg-slate-50"
                      >
                        <Checkbox
                          checked={selectedDiagnoses.has(i)}
                          onCheckedChange={() => toggle(selectedDiagnoses, setSelectedDiagnoses, i)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-medium text-slate-900">
                              {d.icd10Code}
                            </span>
                            {d.severity && (
                              <Badge variant="outline" className="text-xs">
                                {d.severity}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5">{d.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
              )}

              {result.diagnoses.length > 0 && result.prescriptions.length > 0 && <Separator />}

              {result.prescriptions.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Prescripciones ({result.prescriptions.length})
                  </h3>
                  <div className="space-y-2">
                    {result.prescriptions.map((p, i) => {
                      const disabled = !p.matchedMedicationId
                      return (
                        <label
                          key={i}
                          className={`flex items-start gap-3 rounded-md border px-3 py-2.5 ${
                            disabled
                              ? 'border-amber-200 bg-amber-50 cursor-not-allowed opacity-70'
                              : 'border-slate-200 bg-white cursor-pointer hover:bg-slate-50'
                          }`}
                        >
                          <Checkbox
                            checked={!disabled && selectedPrescriptions.has(i)}
                            disabled={disabled}
                            onCheckedChange={() =>
                              !disabled && toggle(selectedPrescriptions, setSelectedPrescriptions, i)
                            }
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-slate-900">
                                {p.medicationName}
                              </span>
                              {disabled && (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-amber-300 text-amber-700 flex items-center gap-1"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  No en catálogo
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {p.dosage} · {p.frequency} · {p.durationDays} días
                            </p>
                            {p.instructions && (
                              <p className="text-xs text-slate-500 mt-0.5 italic">{p.instructions}</p>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </section>
              )}

              {result.prescriptions.length > 0 && result.procedures.length > 0 && <Separator />}

              {result.procedures.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Procedimientos ({result.procedures.length})
                  </h3>
                  <div className="space-y-2">
                    {result.procedures.map((proc, i) => (
                      <label
                        key={i}
                        className="flex items-start gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 cursor-pointer hover:bg-slate-50"
                      >
                        <Checkbox
                          checked={selectedProcedures.has(i)}
                          onCheckedChange={() =>
                            toggle(selectedProcedures, setSelectedProcedures, i)
                          }
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium text-slate-900">
                              {proc.code}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5">{proc.description}</p>
                          {proc.notes && (
                            <p className="text-xs text-slate-500 mt-0.5 italic">{proc.notes}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </ScrollArea>

        <SheetFooter className="flex-row justify-end border-t gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            disabled={totalSelected === 0 || saving || totalItems === 0}
            onClick={() => void handleApply()}
          >
            {saving
              ? 'Guardando...'
              : `Aplicar ${totalSelected} seleccionado${totalSelected !== 1 ? 's' : ''}`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
