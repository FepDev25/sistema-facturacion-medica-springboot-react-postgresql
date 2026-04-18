# Testing del Frontend

## Descripcion General

Suite de testing profesional con dos capas complementarias: unit tests (Vitest + React Testing Library) para logica de negocio, hooks y componentes aislados; y E2E tests (Playwright) para flujos criticos de usuario.

Estrategia pragmatica: unit tests donde hay logica condicional compleja (hooks, columnas, componentes showcase), y E2E para integracion visual y flujos completos (pages, drawers, routing).

---

## Stack de Testing

| Herramienta | Version | Rol |
|---|---|---|
| Vitest | 4.x | Test runner y assertion library |
| React Testing Library | 16.x | Renderizado de componentes en jsdom |
| jsdom | 26.x | Entorno DOM simulado |
| @testing-library/jest-dom | 6.x | Matchers extendidos (`toBeInTheDocument`, `toHaveTextContent`, etc.) |
| Playwright | 1.x | E2E tests en navegador real |

---

## Comandos Utiles

```bash
# Ejecutar toda la suite de unit tests
npx vitest run

# Ejecutar un archivo especifico
npx vitest run src/features/invoices/hooks/useInvoices.hooks.test.ts

# Ejecutar tests en modo watch (desarrollo)
npx vitest

# Ejecutar con cobertura
npx vitest run --coverage

# Ejecutar E2E tests (requiere dev server corriendo en :5173)
npx playwright test

# Ejecutar un archivo E2E especifico
npx playwright test e2e/auth-flow.spec.ts

# E2E en modo headed (ve el navegador)
npx playwright test --headed

# Ver reporte HTML de Playwright (despues de ejecutar tests)
npx playwright show-report

# Build de produccion (verifica que no haya errores de tipos)
npx vite build
```

---

## Estructura de Archivos

```
src/test/
├── setup.ts              # Setup global: importa jest-dom matchers
├── test-utils.tsx         # customRender, createAllProviders, createTestQueryClient
└── api-test-utils.ts      # mockApiClient() para tests de capas API

src/features/*/api/*.test.ts          # Tests de funciones API (9 archivos)
src/features/*/api/*.api.test.ts      # Tests de API con mocking de axios (9 archivos)
src/features/*/hooks/*.hooks.test.ts  # Tests de hooks con TanStack Query (9 archivos)
src/features/*/components/*Columns.test.ts  # Tests de definiciones de columna (12 archivos)
src/features/*/components/*/*Page.test.tsx  # Tests de pages con logica condicional (3 archivos)
src/features/*/store/*.test.ts        # Tests de stores (authSessionStore)
src/components/*/*.test.tsx           # Tests de componentes compartidos (showcase, DataTable, etc.)
src/lib/*.test.ts                     # Tests de utilidades (utils, mock-utils)

e2e/
├── playwright.config.ts              # Configuracion de Playwright
├── auth-flow.spec.ts                 # 27 tests: login, permisos, logout
├── patients-flow.spec.ts             # 25 tests: CRUD, busqueda, paginacion
├── appointments-flow.spec.ts         # 25 tests: estados, transiciones, expedientes
├── invoices-flow.spec.ts             # 25 tests: creacion, confirmacion, pagos
└── role-permissions.spec.ts          # 24 tests: permisos por rol (admin, doctor, asistente)
```

---

## Configuracion de Vitest

### `vitest.config.ts`

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,                           // describe, it, expect sin importar
    environment: 'jsdom',                    // entorno DOM simulado
    setupFiles: ['./src/test/setup.ts'],     // jest-dom matchers
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'e2e/', 'src/test/', '**/*.d.ts', '**/*.config.*', 'src/routeTree.gen.tsx'],
    },
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
```

### `src/test/setup.ts`

```typescript
import '@testing-library/jest-dom/vitest'
```

Este import habilita matchers como `toBeInTheDocument()`, `toHaveTextContent()`, `toBeDisabled()`, etc. en todos los tests sin necesidad de importarlos individualmente.

---

## Infraestructura de Testing

### `src/test/test-utils.tsx`

```typescript
// QueryClient optimizado para tests: sin retry, sin cache
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

// Wrapper que provee QueryClientProvider
function createAllProviders(client?: QueryClient) {
  const qc = client ?? createTestQueryClient()
  function Wrapper({ children }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
  return Wrapper
}

// render() con providers automaticos (reemplaza al de @testing-library/react)
function customRender(ui, options?) {
  return render(ui, { wrapper: createAllProviders(), ...options })
}

export { customRender as render, createTestQueryClient, createAllProviders }
```

### `src/test/api-test-utils.ts`

```typescript
// Crea un mock de apiClient con todos los metodos HTTP
function mockApiClient() {
  return {
    get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: { headers: { common: {} } },
  }
}
```

---

## Patrones por Tipo de Test

### Tests de API

Las funciones API llaman a `apiClient` (Axios). Se mockea el modulo entero y se verifican los argumentos de cada llamada:

```typescript
vi.mock('@/lib/axios', () => ({ apiClient: mockApiClient() }))
import { apiClient } from '@/lib/axios'

it('calls GET with correct URL', async () => {
  await getPatients({ page: 0, size: 10 })
  expect(apiClient.get).toHaveBeenCalledWith('/patients', { params: { page: 0, size: 10 } })
})
```

### Tests de Hooks con TanStack Query

Los hooks de query usan `renderHook` de Testing Library y el wrapper de providers:

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { createAllProviders } from '@/test/test-utils'

vi.mock('@/features/patients/api/patientsApi')

const wrapper = createAllProviders()

it('returns data from API', async () => {
  const { result } = renderHook(() => usePatients({ page: 0 }), { wrapper })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data?.content).toHaveLength(10)
})
```

### Tests de Componentes

Los componentes se renderizan con `render` importado de `@testing-library/react` (usando el `customRender` de `test-utils.tsx` que incluye providers automaticamente):

```typescript
import { render, screen } from '@testing-library/react'

it('renders patient name', () => {
  render(<PatientCard patient={mockPatient} />)
  expect(screen.getByText('Garcia Lopez, Maria')).toBeInTheDocument()
})
```

### Tests de Pages con Dependencias

Los pages orquestan multiples hooks, permisos y router. Se mockean todas las dependencias:

```typescript
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ id: 'inv-1' }),
  useRouterState: () => ({ location: { pathname: '/invoices/inv-1' }, matches: {} }),
  useNavigate: () => vi.fn(),
  Link: ({ to, children }) => <a href={to}>{children}</a>,
}))

vi.mock('@/features/invoices/hooks/useInvoices', () => ({
  useInvoice: () => ({ data: m.invoiceData, isLoading: false }),
  useConfirmInvoice: () => ({ mutate: mockMutate, isPending: false }),
}))

vi.mock('@/features/auth/hooks/useRolePermissions', () => ({
  useRolePermissions: () => ({ canManageInvoices: true }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))
```

### Tests de Definiciones de Columna

Las columnas de TanStack Table son funciones puras `CellContext<T> => ReactNode`. Se renderizan pasando un mock de `cell` y se verifica el output:

```typescript
function renderCell(column, value, row) {
  return render(column.cell!({ getValue: () => value, row, column, table, ... }))
}

it('formats currency for total', () => {
  const { container } = renderCell(totalColumn, 1160, mockRow)
  expect(container).toHaveTextContent('$1,160.00')
})
```

---

## Convenciones y Patterns Importantes

### Estado mutable entre tests con `vi.hoisted`

`vi.hoisted()` se ejecuta antes de los imports. No puede referenciar imports de otros modulos. Para mockear estado mutable, usar un objeto y mutar sus propiedades en `beforeEach`:

```typescript
const { m, mockMutate } = vi.hoisted(() => ({
  m: { invoiceData: null as unknown },
  mockMutate: vi.fn(),
}))

beforeEach(() => {
  m.invoiceData = { id: 'inv-1', status: 'draft' }
  mockMutate.mockClear()
})
```

### Mock parcial de `@/lib/utils`

El archivo `utils.ts` exporta `cn` (usado por todos los componentes shadcn) y funciones de formato. Si se necesita mockear solo las funciones de formato, usar `importOriginal`:

```typescript
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>()
  return {
    ...actual,
    formatCurrency: (n: number) => `$${n.toFixed(2)}`,
    formatDate: (d: string) => d,
  }
})
```

### Mock de TanStack Router

`useRouterState` necesita un estado minimo para evitar `Cannot read properties of null (reading 'stores')`:

```typescript
vi.mock('@tanstack/react-router', () => {
  const routerState = { location: { pathname: '/invoices/inv-1' }, matches: {} }
  return {
    useParams: () => ({ id: 'inv-1' }),
    useRouterState: () => routerState,
    useNavigate: () => vi.fn(),
    Link: ({ to, children, ...rest }) => <a href={to} {...rest}>{children}</a>,
  }
})
```

### Fechas en tests

Usar fechas con componente de hora para evitar problemas de timezone en jsdom:

```typescript
const date = '2025-06-15T12:00:00'
```

### `afterEach(cleanup)` en tests de componentes

Obligatorio para evitar leaks de DOM en jsdom cuando se renderizan multiples componentes en el mismo archivo.

### Labels con acentos

Los componentes usan labels en espanol con acentos. Buscar con el texto exacto o regex:

```typescript
screen.getByLabelText(/Código/)
screen.getByText(/Descripción/)
```

---

## Cobertura Actual

### Unit Tests: 614 tests en 49 archivos

| Area | Archivos | Tests | Descripcion |
|---|---|---|---|
| Utilidades y schemas | 2 | ~10 | `utils.test.ts`, `mock-utils.test.ts` |
| Capas API (funciones) | 9 | ~50 | Mock de `apiClient`, verificacion de args HTTP |
| Capas API (enpoints) | 9 | ~64 | Tests de integracion con datos mock reales |
| Hooks | 9 | ~83 | TanStack Query, `renderHook`, estados loading/error/data |
| Definiciones de columna | 12 | ~60 | Formateo, badges, acciones, conditional rendering |
| Componentes showcase | 3 | ~46 | AppointmentStatusFlow, InvoiceCoverageBar, AllergyAlert |
| Componentes compartidos | 4 | ~30 | DataTable, BackToListButton, LoginPage, AppShell |
| Pages con logica condicional | 3 | ~52 | AppointmentDetailPage, InvoiceDetailPage |
| Auth store | 1 | 21 | authSessionStore (useSyncExternalStore) |

### E2E Tests: 126 tests en 5 archivos

| Archivo | Tests | Flujos cubiertos |
|---|---|---|
| `auth-flow.spec.ts` | 27 | Login, logout, permisos por rol |
| `patients-flow.spec.ts` | 25 | CRUD, busqueda, paginacion, drawer de edicion |
| `appointments-flow.spec.ts` | 25 | Estados, transiciones, expedientes, diagnostico |
| `invoices-flow.spec.ts` | 25 | Creacion, confirmacion, pagos, cobertura de seguro |
| `role-permissions.spec.ts` | 24 | Permisos por rol: admin, doctor, asistente |

**Total: 740 tests** (614 unit + 126 E2E)

---

## Decisiones de Diseno

### Unit tests solo donde hay logica condicional

Los pages que son "wiring components" (solo orquestan hooks y renderizan subcomponentes sin logica condicional compleja) no se testean unitariamente. Se cubren via E2E. Los pages con logica condicional significativa (AppShell: filtrado de nav por permisos, AppointmentDetailPage: `isOwnAppointment`, InvoiceDetailPage: `isDraft`) si tienen unit tests.

### Drawer tests en E2E, no unitarios

Los 11 drawers del sistema usan Radix Sheet, Select, Checkbox y Dialog. Estos componentes de Radix son dificiles de mockear en jsdom (manejan portals, focus trapping, animaciones). Los flujos de drawer se cubren completamente en los E2E tests.

### Componentes showcase con tests dedicados

Los tres componentes "showcase" del portafolio tienen tests unitarios detallados porque representan la calidad visual del proyecto: AppointmentStatusFlow (maquina de estados), InvoiceCoverageBar (barra de cobertura), AllergyAlert (banner de alergias).

### E2E no paralelizados

Los E2E tests ejecutan en un solo proyecto Chromium con `fullyParallel: false`. Esto es intencional: los tests comparten el estado de la app (login, datos mock) y la ejecucion secuencial garantiza reproducibilidad.

---

## Configuracion de Playwright

### `playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
```

Los E2E tests requieren el dev server corriendo. Ejecutar en terminales separadas:

```bash
# Terminal 1: dev server
npm run dev

# Terminal 2: E2E tests
npx playwright test
```
