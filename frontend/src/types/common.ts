export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
  empty: boolean
}

export interface FieldError {
  field: string
  message: string
}

export interface ApiError {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
  fieldErrors?: FieldError[]
}
