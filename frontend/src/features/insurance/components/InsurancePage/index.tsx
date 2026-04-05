import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/DataTable'
import {
  NO_PERMISSION_MESSAGE,
  useRolePermissions,
} from '@/features/auth/hooks/useRolePermissions'
import type {
  InsurancePolicyResponse,
  InsuranceProviderResponse,
} from '@/types/insurance'
import { usePatients } from '@/features/patients/hooks/usePatients'
import {
  useDeactivateProvider,
  usePoliciesPage,
  useProvidersPage,
} from '../../hooks/useInsurance'
import { getProviderColumns } from '../providerColumns'
import { getPolicyColumns } from '../policyColumns'
import { ProviderDrawer } from '../ProviderDrawer'
import { PolicyDrawer } from '../PolicyDrawer'

export function InsurancePage() {
  const { canManageInsurance } = useRolePermissions()

  const [activeTab, setActiveTab] = useState<'providers' | 'policies'>('providers')
  const [showInactiveProviders, setShowInactiveProviders] = useState(false)
  const [showInactivePolicies, setShowInactivePolicies] = useState(false)
  const [policyPatientId, setPolicyPatientId] = useState('all')
  const [providersPage, setProvidersPage] = useState(0)
  const [policiesPage, setPoliciesPage] = useState(0)
  const pageSize = 20

  const [providerDrawerOpen, setProviderDrawerOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] =
    useState<InsuranceProviderResponse | null>(null)

  const [policyDrawerOpen, setPolicyDrawerOpen] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState<InsurancePolicyResponse | null>(null)

  const { data: providersData, isLoading: providersLoading } = useProvidersPage({
    includeInactive: true,
    page: providersPage,
    size: pageSize,
  })
  const providers = providersData?.content ?? []
  const { data: patients = [] } = usePatients()
  const { data: policiesData, isLoading: policiesLoading } = usePoliciesPage({
    patientId: policyPatientId !== 'all' ? policyPatientId : undefined,
    onlyActive: false,
    page: policiesPage,
    size: pageSize,
  })
  const policies = policiesData?.content ?? []

  const deactivateProvider = useDeactivateProvider()

  const filteredProviders = useMemo(
    () =>
      providers.filter((provider) => (showInactiveProviders ? true : provider.isActive)),
    [providers, showInactiveProviders],
  )

  const filteredPolicies = useMemo(
    () => policies.filter((policy) => (showInactivePolicies ? true : policy.isActive)),
    [policies, showInactivePolicies],
  )

  const providerColumns = useMemo(
    () =>
      getProviderColumns({
        onEdit: (provider) => {
          if (!canManageInsurance) {
            toast.error(NO_PERMISSION_MESSAGE)
            return
          }
          setSelectedProvider(provider)
          setProviderDrawerOpen(true)
        },
        onDeactivate: (provider) => {
          if (!canManageInsurance) {
            toast.error(NO_PERMISSION_MESSAGE)
            return
          }
          deactivateProvider.mutate(provider.id)
        },
        canManage: canManageInsurance,
      }),
    [canManageInsurance, deactivateProvider],
  )

  const policyColumns = useMemo(
    () =>
      getPolicyColumns({
        onEdit: (policy) => {
          if (!canManageInsurance) {
            toast.error(NO_PERMISSION_MESSAGE)
            return
          }
          setSelectedPolicy(policy)
          setPolicyDrawerOpen(true)
        },
        canManage: canManageInsurance,
      }),
    [canManageInsurance],
  )

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">Seguros</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Administracion de aseguradoras y polizas por paciente
        </p>
      </div>

      <div className="flex-1 px-6 py-5 overflow-auto">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'providers' | 'policies')}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 gap-3">
            <TabsList className="h-8">
              <TabsTrigger value="providers" className="text-xs px-4">
                Aseguradoras
                <span className="ml-1.5 text-slate-400 font-normal">({filteredProviders.length})</span>
              </TabsTrigger>
              <TabsTrigger value="policies" className="text-xs px-4">
                Polizas
                <span className="ml-1.5 text-slate-400 font-normal">({filteredPolicies.length})</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {activeTab === 'providers' && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="show-inactive-providers"
                      checked={showInactiveProviders}
                      onCheckedChange={(checked) => {
                        setShowInactiveProviders(!!checked)
                        setProvidersPage(0)
                      }}
                    />
                    <Label
                      htmlFor="show-inactive-providers"
                      className="text-sm text-slate-600 cursor-pointer"
                    >
                      Mostrar inactivas
                    </Label>
                  </div>

                  <Button
                    size="sm"
                    className="h-8 gap-1.5 w-full sm:w-auto"
                    disabled={!canManageInsurance}
                    onClick={() => {
                      if (!canManageInsurance) {
                        toast.error(NO_PERMISSION_MESSAGE)
                        return
                      }
                      setSelectedProvider(null)
                      setProviderDrawerOpen(true)
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nueva aseguradora
                  </Button>
                </div>
              )}

              {activeTab === 'policies' && (
                <div className="flex items-center gap-3">
                  <div className="w-full sm:w-72">
                    <Select
                      value={policyPatientId}
                      onValueChange={(value) => {
                        setPolicyPatientId(value)
                        setPoliciesPage(0)
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Todos los pacientes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los pacientes</SelectItem>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.firstName} {patient.lastName} ({patient.dni})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="show-inactive-policies"
                      checked={showInactivePolicies}
                      onCheckedChange={(checked) => {
                        setShowInactivePolicies(!!checked)
                        setPoliciesPage(0)
                      }}
                    />
                    <Label
                      htmlFor="show-inactive-policies"
                      className="text-sm text-slate-600 cursor-pointer"
                    >
                      Mostrar inactivas
                    </Label>
                  </div>

                  <Button
                    size="sm"
                    className="h-8 gap-1.5 w-full sm:w-auto"
                    disabled={!canManageInsurance}
                    onClick={() => {
                      if (!canManageInsurance) {
                        toast.error(NO_PERMISSION_MESSAGE)
                        return
                      }
                      setSelectedPolicy(null)
                      setPolicyDrawerOpen(true)
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nueva poliza
                  </Button>
                </div>
              )}
            </div>
          </div>

          <TabsContent value="providers">
            <DataTable
              columns={providerColumns}
              data={filteredProviders}
              isLoading={providersLoading}
              pageSize={20}
              emptyMessage="No hay aseguradoras registradas."
            />
            {!providersLoading && providersData && providersData.totalPages > 1 ? (
              <div className="mt-3 flex items-center justify-between px-1">
                <p className="text-xs text-slate-500">
                  Pagina {providersData.number + 1} de {providersData.totalPages} -{' '}
                  {providersData.totalElements} aseguradoras
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Pagina anterior"
                    onClick={() => setProvidersPage((prev) => Math.max(prev - 1, 0))}
                    disabled={providersData.number <= 0}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Pagina siguiente"
                    onClick={() =>
                      setProvidersPage((prev) =>
                        providersData.number + 1 >= providersData.totalPages ? prev : prev + 1,
                      )
                    }
                    disabled={providersData.number + 1 >= providersData.totalPages}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="policies">
            <DataTable
              columns={policyColumns}
              data={filteredPolicies}
              isLoading={policiesLoading}
              pageSize={20}
              emptyMessage="No hay polizas registradas."
            />
            {!policiesLoading && policiesData && policiesData.totalPages > 1 ? (
              <div className="mt-3 flex items-center justify-between px-1">
                <p className="text-xs text-slate-500">
                  Pagina {policiesData.number + 1} de {policiesData.totalPages} -{' '}
                  {policiesData.totalElements} polizas
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Pagina anterior"
                    onClick={() => setPoliciesPage((prev) => Math.max(prev - 1, 0))}
                    disabled={policiesData.number <= 0}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Pagina siguiente"
                    onClick={() =>
                      setPoliciesPage((prev) =>
                        policiesData.number + 1 >= policiesData.totalPages ? prev : prev + 1,
                      )
                    }
                    disabled={policiesData.number + 1 >= policiesData.totalPages}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>

      <ProviderDrawer
        open={providerDrawerOpen}
        onOpenChange={setProviderDrawerOpen}
        item={selectedProvider}
      />

      <PolicyDrawer
        open={policyDrawerOpen}
        onOpenChange={setPolicyDrawerOpen}
        item={selectedPolicy}
      />
    </div>
  )
}
