import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as appointmentsApi from '../api/appointmentsApi'
import type { MedicalRecordCreateRequest } from '@/types/medical-record'
import { extractApiErrorMessage } from '@/lib/utils'

export const appointmentKeys = {
  all: ['appointments'] as const,
  list: (params: object = {}) => [...appointmentKeys.all, 'list', params] as const,
  detail: (id: string) => [...appointmentKeys.all, 'detail', id] as const,
  record: (id: string) => [...appointmentKeys.all, 'record', id] as const,
}

export function useAppointments(
  params: {
    status?: string
    doctorId?: string
    patientId?: string
    page?: number
    size?: number
  } = {},
) {
  return useQuery({
    queryKey: appointmentKeys.list(params),
    queryFn: () =>
      appointmentsApi.getAppointments({
        doctorId: params.doctorId,
        patientId: params.patientId,
        status: params.status as
          | 'scheduled'
          | 'confirmed'
          | 'in_progress'
          | 'completed'
          | 'cancelled'
          | 'no_show'
          | undefined,
        page: params.page ?? 0,
        size: params.size ?? 20,
      }),
  })
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: () => appointmentsApi.getAppointmentById(id),
    enabled: !!id,
  })
}

export function useAppointmentMedicalRecord(appointmentId: string) {
  return useQuery({
    queryKey: appointmentKeys.record(appointmentId),
    queryFn: () => appointmentsApi.getMedicalRecordByAppointment(appointmentId),
    enabled: !!appointmentId,
  })
}

export function useCreateAppointment() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: appointmentsApi.createAppointment,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: appointmentKeys.all })
      toast.success('Cita creada')
    },
    onError: (error) => {
      toast.error(extractApiErrorMessage(error) ?? 'Error al crear la cita')
    },
  })
}

function useStatusMutation(
  mutationFn: (id: string) => Promise<unknown>,
  successMessage: string,
  errorMessage: string,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: appointmentKeys.all })
      toast.success(successMessage)
    },
    onError: (error) => {
      toast.error(extractApiErrorMessage(error) ?? errorMessage)
    },
  })
}

export function useConfirmAppointment() {
  return useStatusMutation(
    appointmentsApi.confirmAppointment,
    'Cita confirmada',
    'Error al confirmar la cita',
  )
}

export function useStartAppointment() {
  return useStatusMutation(
    appointmentsApi.startAppointment,
    'Cita iniciada',
    'Error al iniciar la cita',
  )
}

export function useCancelAppointment() {
  return useStatusMutation(
    appointmentsApi.cancelAppointment,
    'Cita cancelada',
    'Error al cancelar la cita',
  )
}

export function useNoShowAppointment() {
  return useStatusMutation(
    appointmentsApi.noShowAppointment,
    'Cita marcada como no show',
    'Error al actualizar la cita',
  )
}

export function useCompleteAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MedicalRecordCreateRequest }) =>
      appointmentsApi.completeAppointment(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: appointmentKeys.all })
      void qc.invalidateQueries({ queryKey: ['medical-records'] })
      toast.success('Cita completada')
    },
    onError: (error) => {
      toast.error(extractApiErrorMessage(error) ?? 'Error al completar la cita')
    },
  })
}
