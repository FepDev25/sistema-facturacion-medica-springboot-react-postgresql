import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { DataTable } from '@/components/DataTable'
import type {
  InsurancePolicyResponse,
  InsuranceProviderResponse,
} from '@/types/insurance'
import {
  useDeactivateProvider,
  usePolicies,
  useProviders,
} from '../../hooks/useInsurance'
import { getProviderColumns } from '../providerColumns'
import { getPolicyColumns } from '../policyColumns'
import { ProviderDrawer } from '../ProviderDrawer'
import { PolicyDrawer } from '../PolicyDrawer'

export function InsurancePage() {
  const [activeTab, setActiveTab] = useState<'providers' | 'policies'>('providers')
  const [showInactiveProviders, setShowInactiveProviders] = useState(false)
  const [showInactivePolicies, setShowInactivePolicies] = useState(false)

  const [providerDrawerOpen, setProviderDrawerOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] =
    useState<InsuranceProviderResponse | null>(null)

  const [policyDrawerOpen, setPolicyDrawerOpen] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState<InsurancePolicyResponse | null>(null)

  const { data: providers = [], isLoading: providersLoading } = useProviders({
    includeInactive: true,
  })
  const { data: policies = [], isLoading: policiesLoading } = usePolicies({
    onlyActive: false,
  })

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
          setSelectedProvider(provider)
          setProviderDrawerOpen(true)
        },
        onDeactivate: (provider) => deactivateProvider.mutate(provider.id),
      }),
    [deactivateProvider],
  )

  const policyColumns = useMemo(
    () =>
      getPolicyColumns({
        onEdit: (policy) => {
          setSelectedPolicy(policy)
          setPolicyDrawerOpen(true)
        },
      }),
    [],
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
                      onCheckedChange={(checked) => setShowInactiveProviders(!!checked)}
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
                    onClick={() => {
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
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="show-inactive-policies"
                      checked={showInactivePolicies}
                      onCheckedChange={(checked) => setShowInactivePolicies(!!checked)}
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
                    onClick={() => {
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
          </TabsContent>

          <TabsContent value="policies">
            <DataTable
              columns={policyColumns}
              data={filteredPolicies}
              isLoading={policiesLoading}
              pageSize={20}
              emptyMessage="No hay polizas registradas."
            />
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
