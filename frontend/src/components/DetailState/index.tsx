import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function DetailSkeleton({ label = 'Cargando información' }: { label?: string }) {
  return (
    <div className="flex h-full flex-col" role="status" aria-busy="true" aria-label={label}>
      <div className="border-b border-border bg-card px-6 py-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-2 h-3.5 w-64" />
      </div>
      <div className="flex-1 space-y-4 px-6 py-5">
        <div className="rounded-xl border border-border bg-card p-5">
          <Skeleton className="h-4 w-40" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3 rounded-xl border border-border bg-card p-5">
          <Skeleton className="h-4 w-36" />
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function QueryError({
  message = 'No se pudo cargar la información.',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </Button>
      ) : null}
    </div>
  )
}
