import { apiClient } from '@/lib/axios'

export interface DashboardMetrics {
  totalPatients: number
  activeDoctors: number
  appointmentsToday: number
  upcomingAppointments: number
  pendingInvoices: number
  overdueInvoices: number
  totalCollected: number
  pendingCollection: number
}

// El backend agrega con SQL: el frontend ya no descarga cientos de filas ni
// reconstruye las métricas en el cliente.
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const response = await apiClient.get<DashboardMetrics>('/dashboard/metrics')
  return response.data
}
