import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { DataTable } from '@/components/DataTable'
import type { ServiceResponse, MedicationResponse } from '@/types/catalog'
import { useServices, useMedications, useToggleServiceActive, useToggleMedicationActive } from '../../hooks/useCatalog'
import { getServiceColumns } from '../serviceColumns'
import { getMedicationColumns } from '../medicationColumns'
import { ServiceDrawer } from '../ServiceDrawer'
import { MedicationDrawer } from '../MedicationDrawer'

export function CatalogPage() {
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const [serviceDrawerOpen, setServiceDrawerOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<ServiceResponse | null>(null)

  const [medicationDrawerOpen, setMedicationDrawerOpen] = useState(false)
  const [selectedMedication, setSelectedMedication] = useState<MedicationResponse | null>(null)

  const { data: services = [], isLoading: servicesLoading } = useServices({
    includeInactive: true,
  })
  const { data: medications = [], isLoading: medicationsLoading } = useMedications({
    includeInactive: true,
  })

  const toggleServiceActive = useToggleServiceActive()
  const toggleMedicationActive = useToggleMedicationActive()

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (!showInactive && !s.isActive) return false
      if (!search) return true
      const q = search.toLowerCase()
      return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    })
  }, [services, search, showInactive])

  const filteredMedications = useMemo(() => {
    return medications.filter((m) => {
      if (!showInactive && !m.isActive) return false
      if (!search) return true
      const q = search.toLowerCase()
      return m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q)
    })
  }, [medications, search, showInactive])

  const serviceColumns = useMemo(
    () =>
      getServiceColumns({
        onEdit: (s) => {
          setSelectedService(s)
          setServiceDrawerOpen(true)
        },
        onToggleActive: (s) => toggleServiceActive.mutate(s.id),
      }),
    [toggleServiceActive],
  )

  const medicationColumns = useMemo(
    () =>
      getMedicationColumns({
        onEdit: (m) => {
          setSelectedMedication(m)
          setMedicationDrawerOpen(true)
        },
        onToggleActive: (m) => toggleMedicationActive.mutate(m.id),
      }),
    [toggleMedicationActive],
  )

  function handleTabChange() {
    setSearch('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">Catálogo</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Gestión de servicios médicos y medicamentos
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-5 overflow-auto">
        <Tabs defaultValue="services" onValueChange={handleTabChange}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="h-8">
              <TabsTrigger value="services" className="text-xs px-4">
                Servicios
                <span className="ml-1.5 text-slate-400 font-normal">
                  ({filteredServices.length})
                </span>
              </TabsTrigger>
              <TabsTrigger value="medications" className="text-xs px-4">
                Medicamentos
                <span className="ml-1.5 text-slate-400 font-normal">
                  ({filteredMedications.length})
                </span>
          </TabsTrigger>
            </TabsList>

            {/* Toolbar */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por código o nombre..."
                  className="h-8 pl-8 w-64 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-inactive"
                  checked={showInactive}
                  onCheckedChange={(v) => setShowInactive(!!v)}
                />
                <Label htmlFor="show-inactive" className="text-sm text-slate-600 cursor-pointer">
                  Mostrar inactivos
                </Label>
              </div>

              <TabsContent value="services" asChild>
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => {
                    setSelectedService(null)
                    setServiceDrawerOpen(true)
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nuevo servicio
                </Button>
              </TabsContent>

              <TabsContent value="medications" asChild>
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => {
                    setSelectedMedication(null)
                    setMedicationDrawerOpen(true)
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nuevo medicamento
                </Button>
              </TabsContent>
            </div>
          </div>

          <TabsContent value="services">
            <DataTable
              columns={serviceColumns}
              data={filteredServices}
              isLoading={servicesLoading}
              pageSize={20}
              emptyMessage={
                search ? 'Sin resultados para la búsqueda.' : 'No hay servicios registrados.'
              }
            />
          </TabsContent>

          <TabsContent value="medications">
            <DataTable
              columns={medicationColumns}
              data={filteredMedications}
              isLoading={medicationsLoading}
              pageSize={20}
              emptyMessage={
                search ? 'Sin resultados para la búsqueda.' : 'No hay medicamentos registrados.'
              }
            />
          </TabsContent>
        </Tabs>
      </div>

      <ServiceDrawer
        open={serviceDrawerOpen}
        onOpenChange={setServiceDrawerOpen}
        item={selectedService}
      />
      <MedicationDrawer
        open={medicationDrawerOpen}
        onOpenChange={setMedicationDrawerOpen}
        item={selectedMedication}
      />
    </div>
  )
}
