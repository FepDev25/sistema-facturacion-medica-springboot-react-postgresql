import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { DataTable } from '@/components/DataTable'
import {
  NO_PERMISSION_MESSAGE,
  useRolePermissions,
} from '@/features/auth/hooks/useRolePermissions'
import type { ServiceResponse, MedicationResponse } from '@/types/catalog'
import {
  useFilteredMedicationsPage,
  useFilteredServicesPage,
  useToggleServiceActive,
  useToggleMedicationActive,
} from '../../hooks/useCatalog'
import { getServiceColumns } from '../serviceColumns'
import { getMedicationColumns } from '../medicationColumns'
import { ServiceDrawer } from '../ServiceDrawer'
import { MedicationDrawer } from '../MedicationDrawer'

export function CatalogPage() {
  const { canManageCatalog } = useRolePermissions()

  const [activeTab, setActiveTab] = useState<'services' | 'medications'>('services')
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [page, setPage] = useState(0)
  const pageSize = 20

  const [serviceDrawerOpen, setServiceDrawerOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<ServiceResponse | null>(null)

  const [medicationDrawerOpen, setMedicationDrawerOpen] = useState(false)
  const [selectedMedication, setSelectedMedication] = useState<MedicationResponse | null>(null)

  const { data: servicesPage, isLoading: servicesLoading } = useFilteredServicesPage({
    includeInactive: true,
    q: activeTab === 'services' ? search : undefined,
    page: activeTab === 'services' ? page : 0,
    size: pageSize,
  })
  const services = servicesPage?.content ?? []

  const { data: medicationsPage, isLoading: medicationsLoading } = useFilteredMedicationsPage({
    includeInactive: true,
    q: activeTab === 'medications' ? search : undefined,
    page: activeTab === 'medications' ? page : 0,
    size: pageSize,
  })
  const medications = medicationsPage?.content ?? []

  const toggleServiceActive = useToggleServiceActive()
  const toggleMedicationActive = useToggleMedicationActive()

  const filteredServices = useMemo(
    () => services.filter((s) => (showInactive ? true : s.isActive)),
    [services, showInactive],
  )

  const filteredMedications = useMemo(
    () => medications.filter((m) => (showInactive ? true : m.isActive)),
    [medications, showInactive],
  )

  const serviceColumns = useMemo(
    () =>
      getServiceColumns({
        onEdit: (s) => {
          if (!canManageCatalog) {
            toast.error(NO_PERMISSION_MESSAGE)
            return
          }
          setSelectedService(s)
          setServiceDrawerOpen(true)
        },
        onToggleActive: (s) => {
          if (!canManageCatalog) {
            toast.error(NO_PERMISSION_MESSAGE)
            return
          }
          toggleServiceActive.mutate(s.id)
        },
        canManage: canManageCatalog,
      }),
    [canManageCatalog, toggleServiceActive],
  )

  const medicationColumns = useMemo(
    () =>
      getMedicationColumns({
        onEdit: (m) => {
          if (!canManageCatalog) {
            toast.error(NO_PERMISSION_MESSAGE)
            return
          }
          setSelectedMedication(m)
          setMedicationDrawerOpen(true)
        },
        onToggleActive: (m) => {
          if (!canManageCatalog) {
            toast.error(NO_PERMISSION_MESSAGE)
            return
          }
          toggleMedicationActive.mutate(m.id)
        },
        canManage: canManageCatalog,
      }),
    [canManageCatalog, toggleMedicationActive],
  )

  function handleTabChange(value: string) {
    setActiveTab(value as 'services' | 'medications')
    setSearch('')
    setPage(0)
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
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 gap-3">
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(0)
                  }}
                  placeholder="Buscar por código o nombre..."
                  className="h-8 pl-8 w-full sm:w-64 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-inactive"
                  checked={showInactive}
                  onCheckedChange={(v) => {
                    setShowInactive(!!v)
                    setPage(0)
                  }}
                />
                <Label htmlFor="show-inactive" className="text-sm text-slate-600 cursor-pointer">
                  Mostrar inactivos
                </Label>
              </div>

              {activeTab === 'services' && (
                <Button
                  size="sm"
                  className="h-8 gap-1.5 w-full sm:w-auto"
                  disabled={!canManageCatalog}
                  onClick={() => {
                    if (!canManageCatalog) {
                      toast.error(NO_PERMISSION_MESSAGE)
                      return
                    }
                    setSelectedService(null)
                    setServiceDrawerOpen(true)
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nuevo servicio
                </Button>
              )}

              {activeTab === 'medications' && (
                <Button
                  size="sm"
                  className="h-8 gap-1.5 w-full sm:w-auto"
                  disabled={!canManageCatalog}
                  onClick={() => {
                    if (!canManageCatalog) {
                      toast.error(NO_PERMISSION_MESSAGE)
                      return
                    }
                    setSelectedMedication(null)
                    setMedicationDrawerOpen(true)
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nuevo medicamento
                </Button>
              )}
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
            {!servicesLoading && servicesPage && servicesPage.totalPages > 1 ? (
              <div className="mt-3 flex items-center justify-between px-1">
                <p className="text-xs text-slate-500">
                  Pagina {servicesPage.number + 1} de {servicesPage.totalPages} -{' '}
                  {servicesPage.totalElements} servicios
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Pagina anterior"
                    onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                    disabled={servicesPage.number <= 0}
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
                        servicesPage.number + 1 >= servicesPage.totalPages ? prev : prev + 1,
                      )
                    }
                    disabled={servicesPage.number + 1 >= servicesPage.totalPages}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : null}
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
            {!medicationsLoading && medicationsPage && medicationsPage.totalPages > 1 ? (
              <div className="mt-3 flex items-center justify-between px-1">
                <p className="text-xs text-slate-500">
                  Pagina {medicationsPage.number + 1} de {medicationsPage.totalPages} -{' '}
                  {medicationsPage.totalElements} medicamentos
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Pagina anterior"
                    onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                    disabled={medicationsPage.number <= 0}
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
                        medicationsPage.number + 1 >= medicationsPage.totalPages ? prev : prev + 1,
                      )
                    }
                    disabled={medicationsPage.number + 1 >= medicationsPage.totalPages}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : null}
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
