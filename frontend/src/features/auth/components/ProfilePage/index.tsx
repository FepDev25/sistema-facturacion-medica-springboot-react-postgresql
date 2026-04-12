import { Badge } from '@/components/ui/badge'
import { useProfile } from '../../hooks/useProfile'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  DOCTOR: 'Doctor',
  RECEPTIONIST: 'Recepcion',
}

export function ProfilePage() {
  const { data: profile, isLoading, error } = useProfile()

  if (isLoading) {
    return <div className="px-6 py-8 text-sm text-slate-500">Cargando perfil...</div>
  }

  if (error || !profile) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-slate-500">No se pudo cargar el perfil del usuario.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">Mi perfil</h1>
        <p className="text-sm text-slate-500 mt-0.5">Informacion de la cuenta</p>
      </div>

      <div className="flex-1 px-6 py-5 overflow-auto">
        <div className="max-w-lg space-y-6">
          <section className="rounded-md border border-border bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Datos de usuario</h2>
            <div className="grid gap-4">
              <div>
                <p className="text-xs text-slate-500">Usuario</p>
                <p className="text-sm text-slate-800 font-mono">{profile.username}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm text-slate-800">{profile.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Rol</p>
                <Badge variant="outline">
                  {ROLE_LABELS[profile.role] ?? profile.role}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-slate-500">Estado</p>
                {profile.active ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0">Activo</Badge>
                ) : (
                  <Badge variant="secondary" className="text-slate-400">Inactivo</Badge>
                )}
              </div>
            </div>
          </section>

          {profile.doctorId && (
            <section className="rounded-md border border-border bg-white p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Perfil de medico vinculado</h2>
              <div className="grid gap-4">
                <div>
                  <p className="text-xs text-slate-500">Nombre</p>
                  <p className="text-sm text-slate-800">
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
