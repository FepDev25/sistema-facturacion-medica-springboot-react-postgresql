import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as doctorsApi from '../api/doctorsApi'
import type { DoctorUpdateRequest } from '@/types/doctor'

export const doctorKeys = {
  all: ['doctors'] as const,
  list: (params: object = {}) => [...doctorKeys.all, 'list', params] as const,
  detail: (id: string) => [...doctorKeys.all, 'detail', id] as const,
}

export function useDoctors(params: { includeInactive?: boolean; specialty?: string } = {}) {
  return useQuery({
    queryKey: doctorKeys.list(params),
    queryFn: () =>
      doctorsApi.getDoctors({
        page: 0,
        size: 100,
        specialty: params.specialty,
        active: params.includeInactive ? undefined : true,
      }),
    select: (data) => data.content,
  })
}

export function useDoctorsPage(
  params: {
    includeInactive?: boolean
    specialty?: string
    page?: number
    size?: number
  } = {},
) {
  return useQuery({
    queryKey: doctorKeys.list(params),
    queryFn: () =>
      doctorsApi.getDoctors({
        specialty: params.specialty,
        active: params.includeInactive ? undefined : true,
        page: params.page ?? 0,
        size: params.size ?? 20,
      }),
  })
}

export function useDoctorById(id: string) {
  return useQuery({
    queryKey: doctorKeys.detail(id),
    queryFn: () => doctorsApi.getDoctorById(id),
    enabled: !!id,
  })
}

export function useCreateDoctor() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: doctorsApi.createDoctor,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: doctorKeys.all })
      toast.success('Médico creado')
    },
    onError: (error) => {
      toast.error(error.message || 'Error al crear el médico')
    },
  })
}

export function useUpdateDoctor() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DoctorUpdateRequest }) =>
      doctorsApi.updateDoctor(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: doctorKeys.all })
      toast.success('Médico actualizado')
    },
    onError: () => {
      toast.error('Error al actualizar el médico')
    },
  })
}

export function useDeactivateDoctor() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: doctorsApi.deactivateDoctor,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: doctorKeys.all })
      toast.success('Médico desactivado')
    },
    onError: () => {
      toast.error('Error al desactivar el médico')
    },
  })
}
