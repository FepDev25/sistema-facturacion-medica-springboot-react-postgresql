import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataTable } from '@/components/DataTable'
import type { DoctorResponse } from '@/types/doctor'
import { useDeactivateDoctor, useDoctors } from '../../hooks/useDoctors'
import { getDoctorColumns } from '../doctorColumns'
import { DoctorDrawer } from '../DoctorDrawer'

export function DoctorsPage() {
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorResponse | null>(null)

  const { data: doctors = [], isLoading } = useDoctors({
    specialty: search.trim() || undefined,
    includeInactive: showInactive,
  })

  const deactivateDoctor = useDeactivateDoctor()

  const columns = useMemo(
    () =>
      getDoctorColumns({
        onEdit: (doctor) => {
          setSelectedDoctor(doctor)
          setDrawerOpen(true)
        },
        onDeactivate: (doctor) => deactivateDoctor.mutate(doctor.id),
      }),
    [deactivateDoctor],
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
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filtrar por especialidad..."
                className="h-8 pl-8 w-72 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="show-inactive-doctors"
                checked={showInactive}
                onCheckedChange={(checked) => setShowInactive(!!checked)}
              />
              <Label htmlFor="show-inactive-doctors" className="text-sm text-slate-600 cursor-pointer">
                Mostrar inactivos
              </Label>
            </div>
          </div>

          <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => {
              setSelectedDoctor(null)
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
      </div>

      <DoctorDrawer open={drawerOpen} onOpenChange={setDrawerOpen} item={selectedDoctor} />
    </div>
  )
}
