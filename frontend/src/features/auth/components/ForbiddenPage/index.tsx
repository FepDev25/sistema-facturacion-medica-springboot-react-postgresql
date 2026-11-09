import { Link, useSearch } from '@tanstack/react-router'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ForbiddenPage() {
  const { from } = useSearch({ from: '/forbidden' })

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-card">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-foreground">No tienes permisos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu rol no permite acceder a{' '}
          {from ? <span className="font-medium text-foreground">{from}</span> : 'esta sección'}. Si
          crees que es un error, contacta a un administrador.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Volver al dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
