import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { toast } from 'sonner'
import * as medicalRecordsApi from '../api/medicalRecordsApi'
import type {
  DiagnosisCreateRequest,
  PrescriptionCreateRequest,
  ProcedureCreateRequest,
} from '@/types/medical-record'

interface ApiErrorPayload {
  message?: string
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<ApiErrorPayload>
  return axiosError.response?.data?.message ?? fallback
}

export const medicalRecordKeys = {
  all: ['medical-records'] as const,
  detail: (id: string) => [...medicalRecordKeys.all, 'detail', id] as const,
  byAppointment: (appointmentId: string) =>
    [...medicalRecordKeys.all, 'appointment', appointmentId] as const,
  byPatient: (patientId: string) => [...medicalRecordKeys.all, 'patient', patientId] as const,
  diagnoses: (recordId: string) => [...medicalRecordKeys.all, 'diagnoses', recordId] as const,
  prescriptions: (recordId: string) => [...medicalRecordKeys.all, 'prescriptions', recordId] as const,
  procedures: (recordId: string) => [...medicalRecordKeys.all, 'procedures', recordId] as const,
}

export function useMedicalRecord(id: string) {
  return useQuery({
    queryKey: medicalRecordKeys.detail(id),
    queryFn: () => medicalRecordsApi.getMedicalRecordById(id),
    enabled: !!id,
  })
}

export function useMedicalRecordByAppointment(appointmentId: string) {
  return useQuery({
    queryKey: medicalRecordKeys.byAppointment(appointmentId),
    queryFn: () => medicalRecordsApi.getMedicalRecordByAppointment(appointmentId),
    enabled: !!appointmentId,
  })
}

export function usePatientMedicalRecords(patientId: string) {
  return useQuery({
    queryKey: medicalRecordKeys.byPatient(patientId),
    queryFn: () => medicalRecordsApi.getMedicalRecordsByPatient(patientId, { page: 0, size: 100 }),
    enabled: !!patientId,
    select: (data) => data.content,
  })
}

export function useMedicalRecordDiagnoses(recordId: string) {
  return useQuery({
    queryKey: medicalRecordKeys.diagnoses(recordId),
    queryFn: () => medicalRecordsApi.getDiagnosesByMedicalRecord(recordId, { page: 0, size: 100 }),
    enabled: !!recordId,
    select: (data) => data.content,
  })
}

export function useMedicalRecordPrescriptions(recordId: string) {
  return useQuery({
    queryKey: medicalRecordKeys.prescriptions(recordId),
    queryFn: () => medicalRecordsApi.getPrescriptionsByMedicalRecord(recordId, { page: 0, size: 100 }),
    enabled: !!recordId,
    select: (data) => data.content,
  })
}

export function useMedicalRecordProcedures(recordId: string) {
  return useQuery({
    queryKey: medicalRecordKeys.procedures(recordId),
    queryFn: () => medicalRecordsApi.getProceduresByMedicalRecord(recordId, { page: 0, size: 100 }),
    enabled: !!recordId,
    select: (data) => data.content,
  })
}

export function useAddDiagnosis(recordId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: DiagnosisCreateRequest) => medicalRecordsApi.addDiagnosis(recordId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: medicalRecordKeys.diagnoses(recordId) })
      toast.success('Diagnostico agregado')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Error al agregar diagnostico'))
    },
  })
}

export function useAddPrescription(recordId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: PrescriptionCreateRequest) =>
      medicalRecordsApi.addPrescription(recordId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: medicalRecordKeys.prescriptions(recordId) })
      toast.success('Prescripcion agregada')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Error al agregar prescripcion'))
    },
  })
}

export function useAddProcedure(recordId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: ProcedureCreateRequest) => medicalRecordsApi.addProcedure(recordId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: medicalRecordKeys.procedures(recordId) })
      toast.success('Procedimiento agregado')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Error al agregar procedimiento'))
    },
  })
}
