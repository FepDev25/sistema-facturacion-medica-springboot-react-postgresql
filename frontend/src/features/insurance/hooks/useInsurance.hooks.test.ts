import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createAllProviders } from '@/test/test-utils'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/insurance/api/insuranceApi', () => ({
  getProviders: vi.fn(),
  createProvider: vi.fn(),
  updateProvider: vi.fn(),
  deactivateProvider: vi.fn(),
  getPolicies: vi.fn(),
  createPolicy: vi.fn(),
  updatePolicy: vi.fn(),
}))

import * as insuranceApi from '@/features/insurance/api/insuranceApi'
import { useProviders, usePolicies, useCreateProvider, useUpdateProvider } from '@/features/insurance/hooks/useInsurance'
import { providerKeys, policyKeys } from '@/features/insurance/hooks/useInsurance'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('providerKeys and policyKeys', () => {
  it('providerKeys.all is base key', () => {
    expect(providerKeys.all).toEqual(['insurance', 'providers'])
  })

  it('policyKeys.all is base key', () => {
    expect(policyKeys.all).toEqual(['insurance', 'policies'])
  })
})

describe('useProviders', () => {
  it('fetches providers and unwraps content via select', async () => {
    vi.mocked(insuranceApi.getProviders).mockResolvedValue({
      content: [{ id: 'prov-1', name: 'ABC', code: '001', phone: '555', email: null, address: null, isActive: true, createdAt: '2025-01-01T00:00:00Z' }],
      totalElements: 1, totalPages: 1, number: 0, size: 100, first: true, last: true, empty: false,
    })
    const { result } = renderHook(() => useProviders(), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(insuranceApi.getProviders).toHaveBeenCalledWith({ page: 0, size: 100, active: true })
  })

  it('passes active=undefined when includeInactive is true', async () => {
    vi.mocked(insuranceApi.getProviders).mockResolvedValue({
      content: [], totalElements: 0, totalPages: 0, number: 0, size: 100, first: true, last: true, empty: true,
    })
    const { result } = renderHook(() => useProviders({ includeInactive: true }), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(insuranceApi.getProviders).toHaveBeenCalledWith(expect.objectContaining({ active: undefined }))
  })
})

describe('usePolicies', () => {
  it('fetches policies and unwraps content via select', async () => {
    vi.mocked(insuranceApi.getPolicies).mockResolvedValue({
      content: [{ id: 'pol-1', patient: { id: 'p-1', dni: '123', firstName: 'Juan', lastName: 'Perez', allergies: null }, provider: { id: 'prov-1', name: 'ABC', code: '001' }, policyNumber: 'POL-001', coveragePercentage: 80, deductible: 500, startDate: '2025-01-01', endDate: '2025-12-31', isActive: true }],
      totalElements: 1, totalPages: 1, number: 0, size: 100, first: true, last: true, empty: false,
    })
    const { result } = renderHook(() => usePolicies(), { wrapper: createAllProviders() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
  })
})

describe('useCreateProvider', () => {
  it('calls createProvider', async () => {
    vi.mocked(insuranceApi.createProvider).mockResolvedValue({ id: 'prov-1' } as never)
    const { result } = renderHook(() => useCreateProvider(), { wrapper: createAllProviders() })
    result.current.mutate({ name: 'ABC', code: '001', phone: '555' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(insuranceApi.createProvider).toHaveBeenCalled()
  })
})

describe('useUpdateProvider', () => {
  it('calls updateProvider with id and data', async () => {
    vi.mocked(insuranceApi.updateProvider).mockResolvedValue({ id: 'prov-1' } as never)
    const { result } = renderHook(() => useUpdateProvider(), { wrapper: createAllProviders() })
    result.current.mutate({ id: 'prov-1', data: { name: 'ABC', phone: '555', isActive: true } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(insuranceApi.updateProvider).toHaveBeenCalledWith('prov-1', expect.objectContaining({ name: 'ABC' }))
  })
})
