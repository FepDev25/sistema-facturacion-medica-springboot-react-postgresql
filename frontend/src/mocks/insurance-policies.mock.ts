import type {
  InsurancePolicyResponse,
  InsurancePolicySummaryResponse,
} from '@/types/insurance'
import { PATIENT_SUMMARIES } from './patients.mock'
import { INSURANCE_PROVIDER_SUMMARIES } from './insurance-providers.mock'

export const INSURANCE_POLICIES_MOCK: InsurancePolicyResponse[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    patient: PATIENT_SUMMARIES['a0000000-0000-0000-0000-000000000002'],
    provider: INSURANCE_PROVIDER_SUMMARIES['c0000000-0000-0000-0000-000000000001'],
    policyNumber: 'POL-2025-001234',
    coveragePercentage: 80,
    deductible: 500,
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    isActive: true,
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    patient: PATIENT_SUMMARIES['a0000000-0000-0000-0000-000000000004'],
    provider: INSURANCE_PROVIDER_SUMMARIES['c0000000-0000-0000-0000-000000000002'],
    policyNumber: 'POL-2025-005678',
    coveragePercentage: 90,
    deductible: 300,
    startDate: '2025-01-15',
    endDate: '2026-01-14',
    isActive: true,
  },
  {
    id: 'd0000000-0000-0000-0000-000000000003',
    patient: PATIENT_SUMMARIES['a0000000-0000-0000-0000-000000000005'],
    provider: INSURANCE_PROVIDER_SUMMARIES['c0000000-0000-0000-0000-000000000003'],
    policyNumber: 'POL-2025-009012',
    coveragePercentage: 100,
    deductible: 0,
    startDate: '2024-06-01',
    endDate: '2026-05-31',
    isActive: true,
  },
  {
    id: 'd0000000-0000-0000-0000-000000000004',
    patient: PATIENT_SUMMARIES['a0000000-0000-0000-0000-000000000006'],
    provider: INSURANCE_PROVIDER_SUMMARIES['c0000000-0000-0000-0000-000000000001'],
    policyNumber: 'POL-2024-003456',
    coveragePercentage: 70,
    deductible: 1000,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    isActive: false,
  },
  {
    id: 'd0000000-0000-0000-0000-000000000005',
    patient: PATIENT_SUMMARIES['a0000000-0000-0000-0000-000000000007'],
    provider: INSURANCE_PROVIDER_SUMMARIES['c0000000-0000-0000-0000-000000000002'],
    policyNumber: 'POL-2025-007890',
    coveragePercentage: 60,
    deductible: 800,
    startDate: '2025-02-01',
    endDate: '2026-01-31',
    isActive: true,
  },
  {
    id: 'd0000000-0000-0000-0000-000000000006',
    patient: PATIENT_SUMMARIES['a0000000-0000-0000-0000-000000000002'],
    provider: INSURANCE_PROVIDER_SUMMARIES['c0000000-0000-0000-0000-000000000003'],
    policyNumber: 'POL-2024-011111',
    coveragePercentage: 50,
    deductible: 500,
    startDate: '2024-01-01',
    endDate: '2025-01-15',
    isActive: false,
  },
]

export const INSURANCE_POLICY_SUMMARIES: Record<
  string,
  InsurancePolicySummaryResponse
> = {
  'd0000000-0000-0000-0000-000000000001': {
    id: 'd0000000-0000-0000-0000-000000000001',
    policyNumber: 'POL-2025-001234',
    coveragePercentage: 80,
    providerName: 'Seguros Médicos del Pacífico',
  },
  'd0000000-0000-0000-0000-000000000002': {
    id: 'd0000000-0000-0000-0000-000000000002',
    policyNumber: 'POL-2025-005678',
    coveragePercentage: 90,
    providerName: 'Aseguradora Nacional de Salud',
  },
  'd0000000-0000-0000-0000-000000000003': {
    id: 'd0000000-0000-0000-0000-000000000003',
    policyNumber: 'POL-2025-009012',
    coveragePercentage: 100,
    providerName: 'Protección Familiar Seguros',
  },
  'd0000000-0000-0000-0000-000000000005': {
    id: 'd0000000-0000-0000-0000-000000000005',
    policyNumber: 'POL-2025-007890',
    coveragePercentage: 60,
    providerName: 'Aseguradora Nacional de Salud',
  },
}
