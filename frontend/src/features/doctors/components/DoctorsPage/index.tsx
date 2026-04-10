import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataTable } from '@/components/DataTable'
import {
  NO_PERMISSION_MESSAGE,
  useRolePermissions,
} from '@/features/auth/hooks/useRolePermissions'
import { useDeactivateDoctor, useDoctorsPage } from '../../hooks/useDoctors'
import { getDoctorColumns } from '../doctorColumns'
import { DoctorDrawer } from '../DoctorDrawer'

export function DoctorsPage() {
  const { canManageDoctors } = useRolePermissions()

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const pageSize = 20

  const { data: doctorsPage, isLoading } = useDoctorsPage({
    specialty: search.trim() || undefined,
    includeInactive: showInactive,
    page,
    size: pageSize,
  })
  const doctors = doctorsPage?.content ?? []

  const deactivateDoctor = useDeactivateDoctor()

  const columns = useMemo(
    () =>
      getDoctorColumns({
        onEdit: (doctor) => {
          if (!canManageDoctors) {
            toast.error(NO_PERMISSION_MESSAGE)
            return
          }
          setEditingDoctorId(doctor.id)
          setDrawerOpen(true)
        },
        onDeactivate: (doctor) => {
          if (!canManageDoctors) {
            toast.error(NO_PERMISSION_MESSAGE)
            return
          }
          deactivateDoctor.mutate(doctor.id)
        },
        canManage: canManageDoctors,
      }),
    [canManageDoctors, deactivateDoctor],
  )

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">Médicos</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Gestión de profesionales, especialidades y estado operativo
        </p>
      </div>

      <div className="flex-1 px-6 py-5 overflow-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(0)
                }}
                placeholder="Filtrar por especialidad..."
                className="h-8 pl-8 w-full sm:w-64 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="show-inactive-doctors"
                checked={showInactive}
                onCheckedChange={(checked) => {
                  setShowInactive(!!checked)
                  setPage(0)
                }}
              />
              <Label htmlFor="show-inactive-doctors" className="text-sm text-slate-600 cursor-pointer">
                Mostrar inactivos
              </Label>
            </div>
          </div>

          <Button
            size="sm"
            className="h-8 gap-1.5 w-full sm:w-auto"
            disabled={!canManageDoctors}
            onClick={() => {
              if (!canManageDoctors) {
                toast.error(NO_PERMISSION_MESSAGE)
                return
              }
              setEditingDoctorId(null)
              setDrawerOpen(true)
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo médico
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={doctors}
          isLoading={isLoading}
          pageSize={20}
          emptyMessage={search ? 'Sin resultados para la búsqueda.' : 'No hay médicos registrados.'}
        />

        {!isLoading && doctorsPage && doctorsPage.totalPages > 1 ? (
          <div className="mt-3 flex items-center justify-between px-1">
            <p className="text-xs text-slate-500">
              Pagina {doctorsPage.number + 1} de {doctorsPage.totalPages} -{' '}
              {doctorsPage.totalElements} medicos
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                aria-label="Pagina anterior"
                onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                disabled={doctorsPage.number <= 0}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                aria-label="Pagina siguiente"
                onClick={() =>
                  setPage((prev) =>
                    doctorsPage.number + 1 >= doctorsPage.totalPages ? prev : prev + 1,
                  )
                }
                disabled={doctorsPage.number + 1 >= doctorsPage.totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <DoctorDrawer open={drawerOpen} onOpenChange={setDrawerOpen} doctorId={editingDoctorId} />
    </div>
  )
}
