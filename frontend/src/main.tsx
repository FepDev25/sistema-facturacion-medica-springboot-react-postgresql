import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from '@tanstack/react-router'
import type { AxiosError } from 'axios'
import { Toaster } from '@/components/ui/sonner'
import { queryClient } from '@/lib/queryClient'
import { router } from '@/routeTree.gen.tsx'
import { getProfile } from '@/features/auth/api/authApi'
import {
  clearAuthSession,
  isAuthenticated,
  setAuthSession,
} from '@/features/auth/store/authSessionStore'
import './index.css'

// Valida en segundo plano que la cookie httpOnly siga viva. Si el refresh token
// expiro o fue revocado, el interceptor redirige a login; si sigue viva, refresca
// los metadatos no sensibles (rol/username) por si cambiaron.
async function bootstrapSession() {
  if (!isAuthenticated()) {
    return
  }

  try {
    const profile = await getProfile()
    setAuthSession({
      role: profile.role,
      userId: profile.id,
      username: profile.username,
    })
  } catch (error) {
    // Un fallo de red no debe cerrar la sesión: la cookie puede seguir viva.
    const status = (error as AxiosError).response?.status
    if (status === 401 || status === 403) {
      clearAuthSession()
    }
  }
}

void bootstrapSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>,
)
