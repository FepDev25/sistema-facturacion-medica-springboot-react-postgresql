import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as catalogApi from '../api/catalogApi'
import { extractApiErrorMessage } from '@/lib/utils'
import type { ServiceUpdateRequest, MedicationUpdateRequest } from '@/types/catalog'
import type { MedicationResponse, ServiceResponse } from '@/types/catalog'
import type { PageResponse } from '@/types/common'

// Query Keys 

export const serviceKeys = {
  all: ['catalog', 'services'] as const,
  list: (params: object = {}) => [...serviceKeys.all, 'list', params] as const,
}

export const medicationKeys = {
  all: ['catalog', 'medications'] as const,
  list: (params: object = {}) => [...medicationKeys.all, 'list', params] as const,
}

// ── Services

export function useServices(params: { includeInactive?: boolean } = {}) {
  return useQuery({
    queryKey: serviceKeys.list(params),
    queryFn: () => catalogApi.getServices({ ...params, size: 100 }),
    select: (data) => data.content,
  })
}

export function useFilteredServicesPage(params: {
  category?: 'consultation' | 'laboratory' | 'imaging' | 'surgery' | 'therapy' | 'emergency' | 'other'
  includeInactive?: boolean
  q?: string
  page?: number
  size?: number
} = {}) {
  return useQuery({
    queryKey: serviceKeys.list(params),
    queryFn: async (): Promise<PageResponse<ServiceResponse>> => {
      if (params.q && params.q.trim().length >= 2) {
        const matched = await catalogApi.searchServicesByName(params.q.trim())
        const filtered = matched.filter((item) => (params.includeInactive ? true : item.isActive))
        const page = params.page ?? 0
        const size = params.size ?? 20
        const start = page * size
        const end = start + size
        const pageItems = filtered.slice(start, end)
        const details = await Promise.all(pageItems.map((item) => catalogApi.getServiceById(item.id)))

        return {
          content: details,
          totalElements: filtered.length,
          totalPages: Math.max(1, Math.ceil(filtered.length / size)),
          size,
          number: page,
          first: page <= 0,
          last: page + 1 >= Math.max(1, Math.ceil(filtered.length / size)),
          empty: filtered.length === 0,
        }
      }

      const response = await catalogApi.listFilteredServices({
        category: params.category,
        active: params.includeInactive ? undefined : true,
        page: params.page ?? 0,
        size: params.size ?? 20,
      })

      const details = await Promise.all(
        response.content.map((item) => catalogApi.getServiceById(item.id)),
      )

      return {
        ...response,
        content: details,
      }
    },
  })
}

export function useCreateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: catalogApi.createService,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceKeys.all })
      toast.success('Servicio creado')
    },
    onError: (error) => toast.error(extractApiErrorMessage(error) ?? 'Error al crear el servicio'),
  })
}

export function useUpdateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ServiceUpdateRequest }) =>
      catalogApi.updateService(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceKeys.all })
      toast.success('Servicio actualizado')
    },
    onError: (error) => toast.error(extractApiErrorMessage(error) ?? 'Error al actualizar el servicio'),
  })
}

export function useToggleServiceActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: catalogApi.toggleServiceActive,
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: serviceKeys.all })
      toast.success(data.isActive ? 'Servicio activado' : 'Servicio desactivado')
    },
    onError: (error) => toast.error(extractApiErrorMessage(error) ?? 'Error al cambiar el estado'),
  })
}

// Medications

export function useMedications(params: { includeInactive?: boolean } = {}) {
  return useQuery({
    queryKey: medicationKeys.list(params),
    queryFn: () => catalogApi.getMedications({ ...params, size: 100 }),
    select: (data) => data.content,
  })
}

export function useFilteredMedicationsPage(params: {
  includeInactive?: boolean
  unit?: 'tablet' | 'capsule' | 'ml' | 'mg' | 'g' | 'unit' | 'box' | 'vial' | 'inhaler'
  requiresPrescription?: boolean
  q?: string
  page?: number
  size?: number
} = {}) {
  return useQuery({
    queryKey: medicationKeys.list(params),
    queryFn: async (): Promise<PageResponse<MedicationResponse>> => {
      const response = await catalogApi.listFilteredMedications({
        active: params.includeInactive ? undefined : true,
        unit: params.unit,
        requiresPrescription: params.requiresPrescription,
        q: params.q,
        page: params.page ?? 0,
        size: params.size ?? 20,
      })

      const details = await Promise.all(
        response.content.map((item) => catalogApi.getMedicationById(item.id)),
      )

      return {
        ...response,
        content: details,
      }
    },
  })
}

export function useCreateMedication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: catalogApi.createMedication,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: medicationKeys.all })
      toast.success('Medicamento creado')
    },
    onError: (error) => toast.error(extractApiErrorMessage(error) ?? 'Error al crear el medicamento'),
  })
}

export function useUpdateMedication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MedicationUpdateRequest }) =>
      catalogApi.updateMedication(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: medicationKeys.all })
      toast.success('Medicamento actualizado')
    },
    onError: (error) => toast.error(extractApiErrorMessage(error) ?? 'Error al actualizar el medicamento'),
  })
}

export function useToggleMedicationActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: catalogApi.toggleMedicationActive,
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: medicationKeys.all })
      toast.success(data.isActive ? 'Medicamento activado' : 'Medicamento desactivado')
    },
    onError: (error) => toast.error(extractApiErrorMessage(error) ?? 'Error al cambiar el estado'),
  })
}
