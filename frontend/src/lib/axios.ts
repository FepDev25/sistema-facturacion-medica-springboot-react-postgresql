import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  config.headers.Authorization = 'Bearer mock-token-dev'
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    return Promise.reject(error)
  },
)
