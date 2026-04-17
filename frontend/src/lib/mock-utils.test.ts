import { describe, expect, it } from 'vitest'
import { paginateArray } from '@/lib/mock-utils'

describe('paginateArray', () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }))

  it('returns first page with correct size', () => {
    const result = paginateArray(items, 0, 10)
    expect(result.content).toHaveLength(10)
    expect(result.content[0].id).toBe(1)
    expect(result.totalElements).toBe(25)
    expect(result.totalPages).toBe(3)
    expect(result.number).toBe(0)
    expect(result.first).toBe(true)
    expect(result.last).toBe(false)
    expect(result.empty).toBe(false)
  })

  it('returns last page with remaining items', () => {
    const result = paginateArray(items, 2, 10)
    expect(result.content).toHaveLength(5)
    expect(result.last).toBe(true)
    expect(result.first).toBe(false)
  })

  it('returns empty content for out-of-range page', () => {
    const result = paginateArray(items, 10, 10)
    expect(result.content).toHaveLength(0)
    expect(result.empty).toBe(true)
  })

  it('defaults to page 0 and size 20', () => {
    const result = paginateArray(items)
    expect(result.number).toBe(0)
    expect(result.size).toBe(20)
    expect(result.content).toHaveLength(20)
    expect(result.totalPages).toBe(2)
  })

  it('handles empty array', () => {
    const result = paginateArray([], 0, 10)
    expect(result.content).toHaveLength(0)
    expect(result.totalElements).toBe(0)
    expect(result.totalPages).toBe(0)
    expect(result.empty).toBe(true)
    expect(result.first).toBe(true)
    expect(result.last).toBe(true)
  })

  it('handles single item with size 1', () => {
    const result = paginateArray([{ id: 1 }], 0, 1)
    expect(result.content).toHaveLength(1)
    expect(result.totalPages).toBe(1)
    expect(result.first).toBe(true)
    expect(result.last).toBe(true)
  })

  it('preserves item data through pagination', () => {
    const complexItems = [
      { id: 1, name: 'Dr. Smith', specialty: 'Cardiology' },
      { id: 2, name: 'Dr. Jones', specialty: 'Neurology' },
      { id: 3, name: 'Dr. Lee', specialty: 'Orthopedics' },
    ]
    const result = paginateArray(complexItems, 1, 2)
    expect(result.content).toHaveLength(1)
    expect(result.content[0]).toEqual({ id: 3, name: 'Dr. Lee', specialty: 'Orthopedics' })
  })
})
