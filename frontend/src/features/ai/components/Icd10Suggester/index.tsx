import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useSuggestIcd10 } from '../../hooks/useAi'

interface Icd10SuggesterProps {
  onSelect: (code: string, description: string) => void
}

export function Icd10Suggester({ onSelect }: Icd10SuggesterProps) {
  const [query, setQuery] = useState('')
  const suggest = useSuggestIcd10()

  function handleSearch() {
    const trimmed = query.trim()
    if (!trimmed) return
    suggest.mutate(trimmed)
  }

  return (
    <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5" />
        Buscar código con IA
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="ej. azúcar alta, presión alta..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSearch()
            }
          }}
          className="text-sm bg-white"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!query.trim() || suggest.isPending}
          onClick={handleSearch}
          className="shrink-0"
        >
          {suggest.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Buscar'
          )}
        </Button>
      </div>

      {suggest.isPending && (
        <div className="space-y-1.5 pt-1">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-4/5" />
        </div>
      )}

      {suggest.data && !suggest.isPending && (
        <div className="pt-1">
          {suggest.data.suggestions.length === 0 ? (
            <p className="text-xs text-slate-500">No se encontraron códigos relacionados.</p>
          ) : (
            <div className="space-y-1">
              {suggest.data.suggestions.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => onSelect(s.code, s.description)}
                  className="w-full text-left rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <span className="font-mono font-medium text-slate-900">{s.code}</span>
                  <span className="ml-2 text-slate-600">{s.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
