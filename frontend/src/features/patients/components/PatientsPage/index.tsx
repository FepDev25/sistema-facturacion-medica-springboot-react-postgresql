import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/DataTable'
import type { PatientResponse } from '@/types/patient'
import { usePatients } from '../../hooks/usePatients'
import { getPatientColumns } from '../patientColumns'
import { PatientDrawer } from '../PatientDrawer'

export function PatientsPage() {
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<PatientResponse | null>(null)

  const { data: patients = [], isLoading } = usePatients({
    lastName: search.trim() || undefined,
  })

  const columns = useMemo(
    () =>
      getPatientColumns({
        onEdit: (patient) => {
          setSelectedPatient(patient)
          setDrawerOpen(true)
        },
      }),
    [],
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filtrar por apellido..."
              className="h-8 pl-8 w-full sm:w-64 text-sm"
            />
          </div>

          <Button
            size="sm"
            className="h-8 gap-1.5 w-full sm:w-auto"
            onClick={() => {
              setSelectedPatient(null)
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
      </div>

      <PatientDrawer open={drawerOpen} onOpenChange={setDrawerOpen} item={selectedPatient} />
    </div>
  )
}
