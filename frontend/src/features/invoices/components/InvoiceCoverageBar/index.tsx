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
  const insurancePercent = toPercent(insuranceCoverage, total)
  const patientPercent = toPercent(patientResponsibility, total)

  return (
    <section className="rounded-md border border-border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900">InvoiceCoverageBar</h2>
        <p className="text-xs text-slate-500">Total {formatCurrency(normalizedTotal)}</p>
      </div>

      <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex">
        <div
          className="h-full bg-cyan-500"
          style={{ width: `${insurancePercent}%` }}
          aria-label="Cobertura del seguro"
        />
        <div
          className="h-full bg-slate-400"
          style={{ width: `${patientPercent}%` }}
          aria-label="Responsabilidad del paciente"
        />
      </div>

      {normalizedTotal <= 0 ? (
        <p className="text-[11px] text-slate-500 mt-2">Aun no hay montos para calcular cobertura.</p>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-md border border-cyan-100 bg-cyan-50 px-3 py-2">
          <p className="text-cyan-700">Seguro ({insurancePercent.toFixed(1)}%)</p>
          <p className="font-medium text-cyan-800">{formatCurrency(insuranceCoverage)}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-slate-600">Paciente ({patientPercent.toFixed(1)}%)</p>
          <p className="font-medium text-slate-800">{formatCurrency(patientResponsibility)}</p>
        </div>
      </div>
    </section>
  )
}
