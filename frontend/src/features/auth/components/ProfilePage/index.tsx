import { Badge } from '@/components/ui/badge'
import { DetailSkeleton, QueryError } from '@/components/DetailState'
import { PageHeader } from '@/components/layout/PageHeader'
import { useProfile } from '../../hooks/useProfile'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  DOCTOR: 'Doctor',
  RECEPTIONIST: 'Recepcion',
}

export function ProfilePage() {
  const { data: profile, isLoading, error, refetch } = useProfile()

  if (isLoading) {
    return <DetailSkeleton label="Cargando perfil" />
  }

  if (error || !profile) {
    return (
      <QueryError
        message="No se pudo cargar el perfil del usuario."
        onRetry={error ? () => void refetch() : undefined}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Mi perfil" subtitle="Informacion de la cuenta" />

      <div className="flex-1 px-6 py-5 overflow-auto">
        <div className="max-w-lg space-y-6">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-sm font-semibold text-foreground mb-4">Datos de usuario</h2>
            <div className="grid gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Usuario</p>
                <p className="text-sm text-foreground font-mono">{profile.username}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm text-foreground">{profile.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rol</p>
                <Badge variant="outline">{ROLE_LABELS[profile.role] ?? profile.role}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                {profile.active ? (
                  <Badge className="bg-success/15 text-success hover:bg-success/15 border-0">
                    Activo
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-muted-foreground/70">
                    Inactivo
                  </Badge>
                )}
              </div>
            </div>
          </section>

          {profile.doctorId && (
            <section className="rounded-xl border border-border bg-card p-5 shadow-card">
              <h2 className="text-sm font-semibold text-foreground mb-4">
                Perfil de medico vinculado
              </h2>
              <div className="grid gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Nombre</p>
                  <p className="text-sm text-foreground">
                    Dr. {profile.doctorFirstName} {profile.doctorLastName}
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
