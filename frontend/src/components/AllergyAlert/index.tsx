import { AlertTriangle, ShieldAlert } from 'lucide-react'

interface AllergyAlertProps {
  allergies?: string | null
  patientName?: string
  compact?: boolean
}

function normalizeAllergies(value?: string | null): string | null {
  if (!value) {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

export function AllergyAlert({ allergies, patientName, compact = false }: AllergyAlertProps) {
  const normalized = normalizeAllergies(allergies)

  if (!normalized) {
    return null
  }

  if (compact) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800">Alergia registrada</p>
            <p className="text-xs text-amber-700 mt-0.5">{normalized}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="rounded-md border border-amber-300 bg-gradient-to-r from-amber-50 to-red-50 px-4 py-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-amber-100 p-2 border border-amber-200">
          <ShieldAlert className="h-4 w-4 text-amber-800" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-900">AllergyAlert</p>
          <p className="text-xs text-amber-800 mt-0.5">
            {patientName ? `${patientName} presenta alergias registradas.` : 'Paciente con alergias registradas.'}{' '}
            Verifica antes de prescribir o administrar medicación.
          </p>
          <p className="text-sm text-red-800 font-medium mt-1 break-words">{normalized}</p>
        </div>
      </div>
    </section>
  )
}
