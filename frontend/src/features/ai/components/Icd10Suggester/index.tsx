import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AiBadge } from '@/components/ui/ai-badge'
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
    <div className="space-y-2 rounded-lg border border-primary/15 bg-primary/5 p-3">
      <p className="flex items-center gap-2 text-xs font-medium text-foreground">
        Buscar código
        <AiBadge />
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
          className="text-sm bg-card"
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
            <p className="text-xs text-muted-foreground">No se encontraron códigos relacionados.</p>
          ) : (
            <div className="space-y-1">
              {suggest.data.suggestions.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => onSelect(s.code, s.description)}
                  className="w-full text-left rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className="font-mono font-medium text-foreground">{s.code}</span>
                  <span className="ml-2 text-muted-foreground">{s.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
