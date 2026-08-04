export interface MetaData {
  page?: number
  limit?: number
  total?: number
  totalPages?: number
  [key: string]: any
}

export interface ApiResponse<T> {
  message: string
  data?: T
  meta?: MetaData
  error?: string
  timestamp?: string
}
