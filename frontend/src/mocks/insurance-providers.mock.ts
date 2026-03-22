import type {
  InsuranceProviderResponse,
  InsuranceProviderSummaryResponse,
} from '@/types/insurance'

export const INSURANCE_PROVIDERS_MOCK: InsuranceProviderResponse[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    name: 'Seguros Médicos del Pacífico',
    code: 'SMP-001',
    phone: '+52-800-111-2222',
    email: 'contacto@segurospacifico.com',
    address: 'Av. Paseo de la Reforma 500, Torre Mayor, CDMX',
    isActive: true,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    name: 'Aseguradora Nacional de Salud',
    code: 'ANS-002',
    phone: '+52-800-333-4444',
    email: 'info@aseguranacional.com',
    address: 'Av. Insurgentes Norte 1000, CDMX',
    isActive: true,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    name: 'Protección Familiar Seguros',
    code: 'PFS-003',
    phone: '+52-800-555-6666',
    email: 'servicios@proteccionfamiliar.com',
    address: 'Calle Montes Urales 424, Lomas de Chapultepec, CDMX',
    isActive: true,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    name: 'Seguros Vida Plena',
    code: 'SVP-004',
    phone: '+52-800-777-8888',
    email: 'contacto@vidaplena.com',
    address: 'Av. Santa Fe 482, Santa Fe, CDMX',
    isActive: false,
  },
]

export const INSURANCE_PROVIDER_SUMMARIES: Record<
  string,
  InsuranceProviderSummaryResponse
> = {
  'c0000000-0000-0000-0000-000000000001': {
    id: 'c0000000-0000-0000-0000-000000000001',
    name: 'Seguros Médicos del Pacífico',
    code: 'SMP-001',
  },
  'c0000000-0000-0000-0000-000000000002': {
    id: 'c0000000-0000-0000-0000-000000000002',
    name: 'Aseguradora Nacional de Salud',
    code: 'ANS-002',
  },
  'c0000000-0000-0000-0000-000000000003': {
    id: 'c0000000-0000-0000-0000-000000000003',
    name: 'Protección Familiar Seguros',
    code: 'PFS-003',
  },
}
