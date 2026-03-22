import {
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
} from '@tanstack/react-router'
import { CatalogPage } from '@/features/catalog/components/CatalogPage'

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-slate-50">
      <Outlet />
    </div>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: function Index() {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-800">
            Sistema de Facturación Médica
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Selecciona un módulo para comenzar
          </p>
          <a
            href="/catalog"
            className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
          >
            Ir al catálogo →
          </a>
        </div>
      </div>
    )
  },
})

const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/catalog',
  component: CatalogPage,
})

const routeTree = rootRoute.addChildren([indexRoute, catalogRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
