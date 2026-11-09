import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { APPOINTMENT_STATUS_LABELS, type AppointmentStatus } from '@/types/enums'

const STATUS_SEQUENCE: AppointmentStatus[] = [
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'no_show',
  'cancelled',
]

interface AppointmentStatusFlowProps {
  status: AppointmentStatus
  canOperate: boolean
  canComplete: boolean
  onConfirm: () => void
  onStart: () => void
  onComplete: () => void
  onNoShow: () => void
  onCancel: () => void
}

function statusClass(status: AppointmentStatus, current: AppointmentStatus): string {
  if (status === current) {
    return 'border-info/40 bg-info/10 text-info shadow-sm'
  }

  return 'border-border bg-white text-muted-foreground'
}

export function AppointmentStatusFlow({
  status,
  canOperate,
  canComplete,
  onConfirm,
  onStart,
  onComplete,
  onNoShow,
  onCancel,
}: AppointmentStatusFlowProps) {
  const canConfirm = status === 'scheduled' && canOperate
  const canStart = status === 'confirmed' && canOperate
  const canDoNoShow = (status === 'scheduled' || status === 'confirmed') && canOperate
  const canDoCancel = (status === 'scheduled' || status === 'confirmed') && canOperate
  const canDoComplete = status === 'in_progress' && canComplete

  const nextTransitionLabel =
    status === 'scheduled'
      ? 'Siguiente recomendado: Confirmar'
      : status === 'confirmed'
        ? 'Siguiente recomendado: Iniciar'
        : status === 'in_progress'
          ? 'Siguiente recomendado: Completar'
          : status === 'completed'
            ? 'Estado final: Completada'
            : status === 'cancelled'
              ? 'Estado final: Cancelada'
              : 'Estado final: No show'

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold text-foreground">AppointmentStatusFlow</h2>
        <p className="text-xs text-muted-foreground">{nextTransitionLabel}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {STATUS_SEQUENCE.map((state, index) => (
          <div key={state} className="flex items-center gap-2">
            <span
              className={`rounded-md border px-2 py-1 text-xs ${statusClass(state, status)}`}
              aria-current={state === status ? 'step' : undefined}
            >
              {APPOINTMENT_STATUS_LABELS[state]}
            </span>
            {index < STATUS_SEQUENCE.length - 1 ? (
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onConfirm} disabled={!canConfirm}>
          Confirmar
        </Button>
        <Button size="sm" variant="outline" onClick={onStart} disabled={!canStart}>
          Iniciar
        </Button>
        <Button size="sm" onClick={onComplete} disabled={!canDoComplete}>
          Completar
        </Button>
        <Button size="sm" variant="outline" onClick={onNoShow} disabled={!canDoNoShow}>
          No show
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={!canDoCancel}>
          Cancelar
        </Button>
      </div>
    </section>
  )
}
