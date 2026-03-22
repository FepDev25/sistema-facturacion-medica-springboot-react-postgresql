import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as catalogApi from '../api/catalogApi'
import type { ServiceUpdateRequest, MedicationUpdateRequest } from '@/types/catalog'

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

export function useCreateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: catalogApi.createService,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceKeys.all })
      toast.success('Servicio creado')
    },
    onError: () => toast.error('Error al crear el servicio'),
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
    onError: () => toast.error('Error al actualizar el servicio'),
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
    onError: () => toast.error('Error al cambiar el estado'),
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

export function useCreateMedication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: catalogApi.createMedication,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: medicationKeys.all })
      toast.success('Medicamento creado')
    },
    onError: () => toast.error('Error al crear el medicamento'),
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
    onError: () => toast.error('Error al actualizar el medicamento'),
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
    onError: () => toast.error('Error al cambiar el estado'),
  })
}
