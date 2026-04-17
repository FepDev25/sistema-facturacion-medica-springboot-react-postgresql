import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as patientsApi from '../api/patientsApi'
import { extractApiErrorMessage } from '@/lib/utils'
import type { PatientUpdateRequest } from '@/types/patient'

export const patientKeys = {
  all: ['patients'] as const,
  list: (params: object = {}) => [...patientKeys.all, 'list', params] as const,
  detail: (id: string) => [...patientKeys.all, 'detail', id] as const,
  appointments: (id: string, params: object = {}) =>
    [...patientKeys.all, 'appointments', id, params] as const,
  policies: (id: string, params: object = {}) =>
    [...patientKeys.all, 'policies', id, params] as const,
  invoices: (id: string, params: object = {}) =>
    [...patientKeys.all, 'invoices', id, params] as const,
  search: (q: string) => [...patientKeys.all, 'search', q] as const,
}

export function usePatients(params: { lastName?: string } = {}) {
  return useQuery({
    queryKey: patientKeys.list(params),
    queryFn: () => patientsApi.getPatients({ ...params, page: 0, size: 100 }),
    select: (data) => data.content,
  })
}

export function usePatientsPage(
  params: { lastName?: string; page?: number; size?: number } = {},
) {
  return useQuery({
    queryKey: patientKeys.list(params),
    queryFn: () =>
      patientsApi.getPatients({
        lastName: params.lastName,
        page: params.page ?? 0,
        size: params.size ?? 20,
      }),
  })
}

export function useCreatePatient() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: patientsApi.createPatient,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: patientKeys.all })
      toast.success('Paciente creado')
    },
    onError: (error) => {
      toast.error(extractApiErrorMessage(error) ?? 'Error al crear el paciente')
    },
  })
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: () => patientsApi.getPatientById(id),
    enabled: !!id,
  })
}

export function usePatientAppointments(id: string) {
  return useQuery({
    queryKey: patientKeys.appointments(id),
    queryFn: () => patientsApi.getPatientAppointments(id),
    enabled: !!id,
    select: (data) => data.content,
  })
}

export function usePatientPolicies(id: string, onlyActive = false) {
  return useQuery({
    queryKey: patientKeys.policies(id, { onlyActive }),
    queryFn: () => patientsApi.getPatientPolicies(id, { onlyActive }),
    enabled: !!id,
    select: (data) => data.content,
  })
}

export function usePatientInvoices(
  id: string,
  params: {
    status?: 'draft' | 'pending' | 'partial_paid' | 'paid' | 'cancelled' | 'overdue'
  } = {},
) {
  return useQuery({
    queryKey: patientKeys.invoices(id, params),
    queryFn: () => patientsApi.getPatientInvoices(id, { ...params, page: 0, size: 20 }),
    enabled: !!id,
    select: (data) => data.content,
  })
}

export function useUpdatePatient() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PatientUpdateRequest }) =>
      patientsApi.updatePatient(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: patientKeys.all })
      toast.success('Paciente actualizado')
    },
    onError: (error) => {
      toast.error(extractApiErrorMessage(error) ?? 'Error al actualizar el paciente')
    },
  })
}

export function useSearchPatients(q: string) {
  return useQuery({
    queryKey: patientKeys.search(q),
    queryFn: () => patientsApi.searchPatients(q),
    enabled: q.trim().length > 1,
  })
}
