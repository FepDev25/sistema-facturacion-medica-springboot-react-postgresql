import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as insuranceApi from '../api/insuranceApi'
import type {
  InsurancePolicyCreateRequest,
  InsuranceProviderUpdateRequest,
} from '@/types/insurance'

export const providerKeys = {
  all: ['insurance', 'providers'] as const,
  list: (params: object = {}) => [...providerKeys.all, 'list', params] as const,
}

export const policyKeys = {
  all: ['insurance', 'policies'] as const,
  list: (params: object = {}) => [...policyKeys.all, 'list', params] as const,
}

export function useProviders(params: { includeInactive?: boolean } = {}) {
  return useQuery({
    queryKey: providerKeys.list(params),
    queryFn: () =>
      insuranceApi.getProviders({
        page: 0,
        size: 100,
        active: params.includeInactive ? undefined : true,
      }),
    select: (data) => data.content,
  })
}

export function useCreateProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: insuranceApi.createProvider,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: providerKeys.all })
      toast.success('Aseguradora creada')
    },
    onError: (error) => toast.error(error.message || 'Error al crear la aseguradora'),
  })
}

export function useUpdateProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsuranceProviderUpdateRequest }) =>
      insuranceApi.updateProvider(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: providerKeys.all })
      void qc.invalidateQueries({ queryKey: policyKeys.all })
      toast.success('Aseguradora actualizada')
    },
    onError: () => toast.error('Error al actualizar la aseguradora'),
  })
}

export function useDeactivateProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: insuranceApi.deactivateProvider,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: providerKeys.all })
      toast.success('Aseguradora desactivada')
    },
    onError: () => toast.error('Error al desactivar la aseguradora'),
  })
}

export function usePolicies(params: { patientId?: string; onlyActive?: boolean } = {}) {
  return useQuery({
    queryKey: policyKeys.list(params),
    queryFn: () => insuranceApi.getPolicies({ ...params, page: 0, size: 100 }),
    select: (data) => data.content,
  })
}

export function useCreatePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: insuranceApi.createPolicy,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: policyKeys.all })
      toast.success('Poliza creada')
    },
    onError: (error) => toast.error(error.message || 'Error al crear la poliza'),
  })
}

export function useUpdatePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsurancePolicyCreateRequest }) =>
      insuranceApi.updatePolicy(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: policyKeys.all })
      toast.success('Poliza actualizada')
    },
    onError: () => toast.error('Error al actualizar la poliza'),
  })
}
