import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Plus } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCurrency } from '@/lib/utils'
import type { ItemSuggestionResult, SuggestedItem } from '@/types/ai'
import type { ItemType } from '@/types'
import { addInvoiceItem } from '@/features/invoices/api/invoicesApi'
import { invoiceKeys } from '@/features/invoices/hooks/useInvoices'

const TYPE_LABELS: Record<SuggestedItem['itemType'], string> = {
  service: 'Servicio',
  medication: 'Medicamento',
  procedure: 'Procedimiento',
  other: 'Otro',
}

const TYPE_COLORS: Record<SuggestedItem['itemType'], string> = {
  service: 'border-blue-200 text-blue-700 bg-blue-50',
  medication: 'border-green-200 text-green-700 bg-green-50',
  procedure: 'border-purple-200 text-purple-700 bg-purple-50',
  other: 'border-slate-200 text-slate-600 bg-slate-50',
}

interface ItemSuggestionPanelProps {
  invoiceId: string
  result: ItemSuggestionResult
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ItemSuggestionPanel({
  invoiceId,
  result,
  open,
  onOpenChange,
}: ItemSuggestionPanelProps) {
  const qc = useQueryClient()
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set())
  const [pendingIndices, setPendingIndices] = useState<Set<number>>(new Set())

  useEffect(() => {
    setAddedIndices(new Set())
    setPendingIndices(new Set())
  }, [result])

  async function handleAdd(item: SuggestedItem, i: number) {
    if (!item.matchedCatalogId || item.unitPrice === null) return

    setPendingIndices((prev) => new Set(prev).add(i))

    try {
      await addInvoiceItem(invoiceId, {
        itemType: item.itemType as ItemType,
        serviceId: item.itemType === 'service' ? item.matchedCatalogId : null,
        medicationId: item.itemType === 'medication' ? item.matchedCatalogId : null,
        description: item.name,
        quantity: 1,
        unitPrice: item.unitPrice,
      })

      void qc.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) })
      void qc.invalidateQueries({ queryKey: invoiceKeys.all })
      toast.success(`"${item.name}" agregado a la factura.`)
      setAddedIndices((prev) => new Set(prev).add(i))
    } catch {
      toast.error(`No se pudo agregar "${item.name}".`)
    } finally {
      setPendingIndices((prev) => {
        const s = new Set(prev)
        s.delete(i)
        return s
      })
    }
  }

  const { suggestedItems } = result

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md gap-0 p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-4 border-b pr-12">
          <SheetTitle>Sugerencias de ítems</SheetTitle>
          <SheetDescription>
            Agrega los ítems sugeridos según el expediente médico de esta factura.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-5 py-4">
          {suggestedItems.length === 0 ? (
            <p className="text-sm text-slate-500">
              No se encontraron sugerencias para este expediente.
            </p>
          ) : (
            <div className="space-y-3">
              {suggestedItems.map((item, i) => {
                const unavailable = !item.matchedCatalogId
                const added = addedIndices.has(i)
                const pending = pendingIndices.has(i)

                return (
                  <div
                    key={i}
                    className="rounded-md border border-slate-200 bg-white p-3 flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge
                          variant="outline"
                          className={`text-xs ${TYPE_COLORS[item.itemType]}`}
                        >
                          {TYPE_LABELS[item.itemType]}
                        </Badge>
                        {item.unitPrice !== null && (
                          <span className="text-xs font-medium text-slate-700">
                            {formatCurrency(item.unitPrice)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {item.justification}
                      </p>
                      {unavailable && (
                        <Badge
                          variant="outline"
                          className="mt-1.5 text-xs border-amber-300 text-amber-700 flex items-center gap-1 w-fit"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          No disponible en catálogo
                        </Badge>
                      )}
                    </div>

                    <div className="shrink-0 pt-0.5">
                      {added ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-700">
                          <CheckCircle2 className="h-4 w-4" />
                          Agregado
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={unavailable || pending}
                          onClick={() => void handleAdd(item, i)}
                        >
                          {pending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Agregar
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <SheetFooter className="flex-row justify-end border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
