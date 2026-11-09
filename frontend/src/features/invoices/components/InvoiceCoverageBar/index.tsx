import { formatCurrency } from '@/lib/utils'

interface InvoiceCoverageBarProps {
  total: number
  insuranceCoverage: number
  patientResponsibility: number
}

function toPercent(amount: number, total: number): number {
  if (total <= 0) {
    return 0
  }

  return Math.max(0, Math.min((amount / total) * 100, 100))
}

export function InvoiceCoverageBar({
  total,
  insuranceCoverage,
  patientResponsibility,
}: InvoiceCoverageBarProps) {
  const normalizedTotal = total > 0 ? total : insuranceCoverage + patientResponsibility
  const insurancePercent = toPercent(insuranceCoverage, normalizedTotal)
  const patientPercent = toPercent(patientResponsibility, normalizedTotal)

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Distribución de cobertura</h2>
        <p className="text-xs text-muted-foreground">Total {formatCurrency(normalizedTotal)}</p>
      </div>

      <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
        <div
          className="h-full bg-info/100 transition-all"
          style={{ width: `${insurancePercent}%` }}
          aria-label="Cobertura del seguro"
        />
        <div
          className="h-full bg-muted-foreground/40 transition-all"
          style={{ width: `${patientPercent}%` }}
          aria-label="Responsabilidad del paciente"
        />
      </div>

      {normalizedTotal <= 0 ? (
        <p className="text-[11px] text-muted-foreground mt-2">
          Aun no hay montos para calcular cobertura.
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-md border border-info/15 bg-info/10 px-3 py-2">
          <p className="text-info">Seguro ({insurancePercent.toFixed(1)}%)</p>
          <p className="font-medium text-info">{formatCurrency(insuranceCoverage)}</p>
        </div>
        <div className="rounded-md border border-border bg-muted/50 px-3 py-2">
          <p className="text-muted-foreground">Paciente ({patientPercent.toFixed(1)}%)</p>
          <p className="font-medium text-foreground">{formatCurrency(patientResponsibility)}</p>
        </div>
      </div>
    </section>
  )
}
