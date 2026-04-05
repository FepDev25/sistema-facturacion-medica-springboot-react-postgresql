import { z } from 'zod'
import { apiClient } from '@/lib/axios'
import type { PageResponse } from '@/types/common'
import type {
  DiagnosisCreateRequest,
  DiagnosisResponse,
  MedicalRecordCreateRequest,
  MedicalRecordResponse,
  PrescriptionCreateRequest,
  PrescriptionResponse,
  ProcedureCreateRequest,
  ProcedureResponse,
} from '@/types/medical-record'

const SEVERITY_VALUES = ['mild', 'moderate', 'severe', 'critical'] as const

export const CompleteAppointmentFormSchema = z.object({
  clinicalNotes: z.string().min(1, 'Requerido').max(2000, 'Maximo 2000 caracteres'),
  physicalExam: z.string().max(2000, 'Maximo 2000 caracteres').optional(),
  bloodPressure: z.string().max(30, 'Maximo 30 caracteres').optional(),
  heartRate: z.number().int().min(1).max(300).optional(),
  temperature: z.number().min(30).max(45).optional(),
  oxygenSaturation: z.number().min(0).max(100).optional(),
  weight: z.number().min(1).max(500).optional(),
  height: z.number().min(30).max(250).optional(),
  glucose: z.number().min(1).max(1000).optional(),
})

export type CompleteAppointmentFormValues = z.infer<typeof CompleteAppointmentFormSchema>

export const DiagnosisFormSchema = z.object({
  icd10Code: z
    .string()
    .min(1, 'Requerido')
    .max(10, 'Maximo 10 caracteres')
    .regex(/^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/, 'Formato ICD-10 invalido'),
  description: z.string().min(1, 'Requerido').max(1000, 'Maximo 1000 caracteres'),
  severity: z.enum(SEVERITY_VALUES).optional(),
  diagnosedAt: z.string().min(1, 'Requerido'),
})

export type DiagnosisFormValues = z.infer<typeof DiagnosisFormSchema>

export const PrescriptionFormSchema = z.object({
  medicationId: z.string().min(1, 'Requerido'),
  dosage: z.string().min(1, 'Requerido').max(200, 'Maximo 200 caracteres'),
  frequency: z.string().min(1, 'Requerido').max(200, 'Maximo 200 caracteres'),
  durationDays: z.number().int().min(1, 'Minimo 1').max(365, 'Maximo 365'),
  instructions: z.string().max(1000, 'Maximo 1000 caracteres').optional(),
})

export type PrescriptionFormValues = z.infer<typeof PrescriptionFormSchema>

export const ProcedureFormSchema = z.object({
  procedureCode: z.string().min(1, 'Requerido').max(50, 'Maximo 50 caracteres'),
  description: z.string().min(1, 'Requerido').max(1000, 'Maximo 1000 caracteres'),
  notes: z.string().max(1000, 'Maximo 1000 caracteres').optional(),
  performedAt: z.string().min(1, 'Requerido'),
})

export type ProcedureFormValues = z.infer<typeof ProcedureFormSchema>

export async function getMedicalRecordById(id: string): Promise<MedicalRecordResponse> {
  const response = await apiClient.get<MedicalRecordResponse>(`/medical-records/${id}`)
  return response.data
}

export async function getMedicalRecordByAppointment(
  appointmentId: string,
): Promise<MedicalRecordResponse | null> {
  try {
    const response = await apiClient.get<MedicalRecordResponse>(
      `/medical-records/appointment/${appointmentId}`,
    )
    return response.data
  } catch {
    return null
  }
}

export async function getMedicalRecordsByPatient(
  patientId: string,
  params: { page?: number; size?: number } = {},
): Promise<PageResponse<MedicalRecordResponse>> {
  const response = await apiClient.get<PageResponse<MedicalRecordResponse>>(
    `/medical-records/patient/${patientId}`,
    {
      params: {
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    },
  )
  return response.data
}

export async function getDiagnosesByMedicalRecord(
  medicalRecordId: string,
  params: { page?: number; size?: number } = {},
): Promise<PageResponse<DiagnosisResponse>> {
  const response = await apiClient.get<PageResponse<DiagnosisResponse>>(
    `/medical-records/${medicalRecordId}/diagnoses`,
    {
      params: {
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    },
  )
  return response.data
}

export async function addDiagnosis(
  medicalRecordId: string,
  data: DiagnosisCreateRequest,
): Promise<DiagnosisResponse> {
  const response = await apiClient.post<DiagnosisResponse>(
    `/medical-records/${medicalRecordId}/diagnoses`,
    data,
  )
  return response.data
}

export async function getPrescriptionsByMedicalRecord(
  medicalRecordId: string,
  params: { page?: number; size?: number } = {},
): Promise<PageResponse<PrescriptionResponse>> {
  const response = await apiClient.get<PageResponse<PrescriptionResponse>>(
    `/medical-records/${medicalRecordId}/prescriptions`,
    {
      params: {
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    },
  )
  return response.data
}

export async function addPrescription(
  medicalRecordId: string,
  data: PrescriptionCreateRequest,
): Promise<PrescriptionResponse> {
  const response = await apiClient.post<PrescriptionResponse>(
    `/medical-records/${medicalRecordId}/prescriptions`,
    data,
  )
  return response.data
}

export async function getProceduresByMedicalRecord(
  medicalRecordId: string,
  params: { page?: number; size?: number } = {},
): Promise<PageResponse<ProcedureResponse>> {
  const response = await apiClient.get<PageResponse<ProcedureResponse>>(
    `/medical-records/${medicalRecordId}/procedures`,
    {
      params: {
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    },
  )
  return response.data
}

export async function addProcedure(
  medicalRecordId: string,
  data: ProcedureCreateRequest,
): Promise<ProcedureResponse> {
  const response = await apiClient.post<ProcedureResponse>(
    `/medical-records/${medicalRecordId}/procedures`,
    data,
  )
  return response.data
}

export function toMedicalRecordCreateRequest(
  appointmentId: string,
  patientId: string,
  values: CompleteAppointmentFormValues,
): MedicalRecordCreateRequest {
  const vitalSigns: Record<string, unknown> = {}

  if (values.bloodPressure && values.bloodPressure.trim()) vitalSigns.bloodPressure = values.bloodPressure.trim()
  if (values.heartRate) vitalSigns.heartRate = values.heartRate
  if (values.temperature) vitalSigns.temperature = values.temperature
  if (values.oxygenSaturation) vitalSigns.oxygenSaturation = values.oxygenSaturation
  if (values.weight) vitalSigns.weight = values.weight
  if (values.height) vitalSigns.height = values.height
  if (values.glucose) vitalSigns.glucose = values.glucose

  return {
    appointmentId,
    patientId,
    clinicalNotes: values.clinicalNotes.trim(),
    physicalExam: values.physicalExam && values.physicalExam.trim() ? values.physicalExam.trim() : null,
    vitalSigns: Object.keys(vitalSigns).length > 0 ? vitalSigns : null,
    recordDate: new Date().toISOString(),
  }
}

export function toDiagnosisCreateRequest(
  appointmentId: string,
  medicalRecordId: string,
  values: DiagnosisFormValues,
): DiagnosisCreateRequest {
  return {
    appointmentId,
    medicalRecordId,
    icd10Code: values.icd10Code.trim().toUpperCase(),
    description: values.description.trim(),
    severity: values.severity ?? null,
    diagnosedAt: new Date(values.diagnosedAt).toISOString(),
  }
}

export function toPrescriptionCreateRequest(
  appointmentId: string,
  medicalRecordId: string,
  values: PrescriptionFormValues,
): PrescriptionCreateRequest {
  return {
    appointmentId,
    medicalRecordId,
    medicationId: values.medicationId,
    dosage: values.dosage.trim(),
    frequency: values.frequency.trim(),
    durationDays: values.durationDays,
    instructions: values.instructions && values.instructions.trim() ? values.instructions.trim() : null,
  }
}

export function toProcedureCreateRequest(
  appointmentId: string,
  medicalRecordId: string,
  values: ProcedureFormValues,
): ProcedureCreateRequest {
  return {
    appointmentId,
    medicalRecordId,
    procedureCode: values.procedureCode.trim(),
    description: values.description.trim(),
    notes: values.notes && values.notes.trim() ? values.notes.trim() : null,
    performedAt: new Date(values.performedAt).toISOString(),
  }
}
