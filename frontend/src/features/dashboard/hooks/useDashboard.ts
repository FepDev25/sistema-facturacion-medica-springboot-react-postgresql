import { useQuery } from '@tanstack/react-query'
import { getDashboardMetrics } from '../api/dashboardApi'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  metrics: () => [...dashboardKeys.all, 'metrics'] as const,
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: dashboardKeys.metrics(),
    queryFn: getDashboardMetrics,
  })
}
