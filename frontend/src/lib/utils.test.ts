import { describe, expect, it } from 'vitest'
import { cn, extractApiErrorMessage, formatCurrency, formatDate, formatDateTime } from '@/lib/utils'

describe('cn', () => {
  it('merges class names with clsx', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('deduplicates conflicting tailwind classes with twMerge', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('returns empty string for no inputs', () => {
    expect(cn()).toBe('')
  })

  it('handles arrays of class names', () => {
    expect(cn(['flex', 'items-center'], 'gap-2')).toBe('flex items-center gap-2')
  })
})

describe('extractApiErrorMessage', () => {
  it('extracts message from AxiosError-shaped object', () => {
    const error = {
      response: {
        data: {
          message: 'El paciente ya existe',
          status: 409,
        },
      },
    }
    expect(extractApiErrorMessage(error)).toBe('El paciente ya existe')
  })

  it('returns undefined for null', () => {
    expect(extractApiErrorMessage(null)).toBeUndefined()
  })

  it('returns undefined for undefined', () => {
    expect(extractApiErrorMessage(undefined)).toBeUndefined()
  })

  it('returns undefined for non-object', () => {
    expect(extractApiErrorMessage('string error')).toBeUndefined()
    expect(extractApiErrorMessage(42)).toBeUndefined()
  })

  it('returns undefined for object without response', () => {
    expect(extractApiErrorMessage({ message: 'no response' })).toBeUndefined()
  })

  it('returns undefined when response.data.message is not a string', () => {
    expect(extractApiErrorMessage({ response: { data: { message: 123 } } })).toBeUndefined()
    expect(extractApiErrorMessage({ response: { data: { message: null } } })).toBeUndefined()
  })

  it('returns undefined when response.data is missing', () => {
    expect(extractApiErrorMessage({ response: {} })).toBeUndefined()
    expect(extractApiErrorMessage({ response: { data: null } })).toBeUndefined()
  })
})

describe('formatCurrency', () => {
  it('formats positive amounts with MXN currency', () => {
    const result = formatCurrency(1250.5)
    expect(result).toContain('1,250')
    expect(result).toContain('50')
  })

  it('formats zero correctly', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
    expect(result).toContain('00')
  })

  it('formats negative amounts', () => {
    const result = formatCurrency(-99.99)
    expect(result).toContain('99.99')
  })

  it('formats very large amounts', () => {
    const result = formatCurrency(1_000_000)
    expect(result).toContain('1,000,000')
  })

  it('always includes 2 decimal places', () => {
    const result = formatCurrency(100)
    expect(result).toMatch(/\.00/)
  })
})

describe('formatDate', () => {
  it('formats ISO date string in es-MX locale', () => {
    const result = formatDate('2025-06-15T12:00:00')
    expect(result).toContain('2025')
    expect(result).toMatch(/15/)
  })

  it('formats date with time component by ignoring time', () => {
    const result = formatDate('2025-06-15T10:30:00')
    expect(result).toContain('2025')
  })

  it('formats date with month name', () => {
    const result = formatDate('2025-06-01T12:00:00')
    expect(result).toMatch(/jun/)
  })
})

describe('formatDateTime', () => {
  it('formats ISO datetime string with date and time', () => {
    const result = formatDateTime('2025-06-15T10:30:00')
    expect(result).toContain('2025')
    expect(result).toMatch(/10:30|10:31/)
  })

  it('formats date-only string as datetime', () => {
    const result = formatDateTime('2025-06-01T12:00:00')
    expect(result).toContain('2025')
  })
})
