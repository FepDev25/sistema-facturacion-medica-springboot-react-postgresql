import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/DataTable'
import {
  NO_PERMISSION_MESSAGE,
  useRolePermissions,
} from '@/features/auth/hooks/useRolePermissions'
import { usePatientsPage } from '../../hooks/usePatients'
import { getPatientColumns } from '../patientColumns'
import { PatientDrawer } from '../PatientDrawer'

export function PatientsPage() {
  const { canManagePatients } = useRolePermissions()

  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const pageSize = 20

  const { data: patientsPage, isLoading } = usePatientsPage({
    lastName: search.trim() || undefined,
    page,
    size: pageSize,
  })
  const patients = patientsPage?.content ?? []

  const columns = useMemo(
    () =>
      getPatientColumns({
        onEdit: (patient) => {
          if (!canManagePatients) {
            toast.error(NO_PERMISSION_MESSAGE)
            return
          }
          setEditingPatientId(patient.id)
          setDrawerOpen(true)
        },
        canEdit: canManagePatients,
      }),
    [canManagePatients],
  )

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">Pacientes</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Registro y actualización de información demográfica y clínica básica
        </p>
      </div>

      <div className="flex-1 px-6 py-5 overflow-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(0)
              }}
              placeholder="Filtrar por apellido..."
              className="h-8 pl-8 w-full sm:w-64 text-sm"
            />
          </div>

          <Button
            size="sm"
            className="h-8 gap-1.5 w-full sm:w-auto"
            disabled={!canManagePatients}
            onClick={() => {
              if (!canManagePatients) {
                toast.error(NO_PERMISSION_MESSAGE)
                return
              }
              setEditingPatientId(null)
              setDrawerOpen(true)
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo paciente
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={patients}
          isLoading={isLoading}
          pageSize={20}
          emptyMessage={search ? 'Sin resultados para la búsqueda.' : 'No hay pacientes registrados.'}
        />

        {!isLoading && patientsPage && patientsPage.totalPages > 1 ? (
          <div className="mt-3 flex items-center justify-between px-1">
            <p className="text-xs text-slate-500">
              Pagina {patientsPage.number + 1} de {patientsPage.totalPages} -{' '}
              {patientsPage.totalElements} pacientes
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                aria-label="Pagina anterior"
                onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                disabled={patientsPage.number <= 0}
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
                    patientsPage.number + 1 >= patientsPage.totalPages ? prev : prev + 1,
                  )
                }
                disabled={patientsPage.number + 1 >= patientsPage.totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <PatientDrawer open={drawerOpen} onOpenChange={setDrawerOpen} patientId={editingPatientId} />
    </div>
  )
}
