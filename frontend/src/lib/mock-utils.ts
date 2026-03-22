import type { PageResponse } from '@/types/common'

// simula latencia de la red
export function mockDelay(): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, Math.random() * 400 + 200),
  )
}

// pagina un array en memoria, devolviendo un PageResponse<T>
export function paginateArray<T>(
  items: T[],
  page: number = 0,
  size: number = 20,
): PageResponse<T> {
  const totalElements = items.length
  const totalPages = Math.ceil(totalElements / size)
  const start = page * size
  const content = items.slice(start, start + size)

  return {
    content,
    totalElements,
    totalPages,
    number: page,
    size,
    first: page === 0,
    last: page >= totalPages - 1,
    empty: content.length === 0,
  }
}
