# SFM Frontend — Sistema de Facturación Médica

Interfaz backoffice para la gestión integral de una clínica: agendamiento de citas con validación de disponibilidad, historias clínicas con diagnósticos ICD-10 y prescripciones, y facturación con cobertura de seguros. Construido sobre React 19 con TypeScript estricto, TanStack Query y TanStack Router.

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| UI Runtime | React | 19.2 |
| Lenguaje | TypeScript (strict) | 5.9 |
| Build | Vite | 8.0 |
| Routing | TanStack Router | 1.168 |
| Estado del servidor | TanStack Query | 5.94 |
| Tablas | TanStack Table | 8.21 |
| Formularios | React Hook Form + Zod | 7.71 + 4.3 |
| Componentes UI | Shadcn/ui + Radix UI | — |
| Estilos | Tailwind CSS | 4.0 |
| HTTP Client | Axios | 1.13 |
| Notificaciones | Sonner | 2.0 |
| Iconos | Lucide React | 0.577 |
| Tipografía | Geist Variable | — |
| Testing unitario | Vitest + React Testing Library | 4.1 + 16.3 |
| Testing E2E | Playwright | 1.59 |

---

## Arquitectura

Aplicación modular organizada por dominio de negocio. Cada feature encapsula su propia capa API, hooks de React Query, tipos TypeScript y componentes. El estado del servidor vive exclusivamente en TanStack Query; el estado de autenticación en un store externo sincronizado con `useSyncExternalStore`.

```
src/
├── features/           # Módulos por dominio (ver detalle abajo)
│   ├── auth/
│   ├── patients/
│   ├── doctors/
│   ├── appointments/
│   ├── medical-records/
│   ├── invoices/
│   ├── insurance/
│   ├── catalog/
│   └── dashboard/
├── components/         # Componentes compartidos (AppShell, DataTable, AllergyAlert, etc.)
├── lib/                # axios instance con interceptors JWT, queryClient, utils
├── types/              # Tipos TypeScript espejo exacto de los DTOs del backend
└── routeTree.gen.tsx   # Router type-safe (TanStack Router)
```

### Estructura interna de cada feature

```
feature/
├── api/         # Funciones HTTP (getX, createX, updateX...) — naming espejo del servicio Java
├── hooks/       # TanStack Query hooks (useX, useMutationX)
└── components/  # Pages, Drawers, columnas de tabla, componentes específicos
```

### Capas por request

```
Componente → Hook (TanStack Query) → Función API (Axios) → Backend
                                                ↑
                           Request Interceptor: inyecta Bearer token
                           Response Interceptor: refresca JWT en 401,
                                                 maneja 403 con toast
```

---

## Módulos de Negocio

### Auth (`/features/auth`)

Login, logout y refresh de JWT. El `authSessionStore` mantiene `accessToken`, `refreshToken`, `role`, `userId` y `username` en memoria con patrón pub/sub compatible con `useSyncExternalStore`. El Axios interceptor maneja el ciclo completo: inyectar token → detectar 401 → refrescar una sola vez con mutex (`refreshInFlight`) → reintentar la request original → redirigir a login si el refresh falla.

### Pacientes (`/features/patients`)

CRUD con búsqueda por DNI en tiempo real. El detalle incluye historial de citas, facturas, pólizas de seguro y expedientes médicos, cada sección como tabla densa con paginación independiente.

### Médicos (`/features/doctors`)

Listado filtrable por especialidad y estado activo. Drawer de creación/edición con validación de matrícula.

### Citas (`/features/appointments`)

Máquina de estados: `SCHEDULED → CONFIRMED → IN_PROGRESS → COMPLETED`. La creación valida disponibilidad del médico en tiempo real antes de habilitar el submit. `AppointmentStatusFlow` es el componente showcase que renderiza los controles de transición correctos según estado actual y permisos del rol.

### Historias Clínicas (`/features/medical-records`)

Expediente médico con tres secciones: diagnósticos (ICD-10), prescripciones de medicamentos y procedimientos. Se crea automáticamente al completar una cita. Las prescripciones son prerequisito para facturar medicamentos con `requiresPrescription = true`.

### Facturas (`/features/invoices`)

Máquina de estados `DRAFT → PENDING → PAID / PARTIAL_PAID / OVERDUE / CANCELLED`. El detalle permite agregar/eliminar ítems del catálogo, asignar póliza de seguro con recálculo automático de cobertura, confirmar y registrar pagos. `InvoiceCoverageBar` es el componente showcase que visualiza la proporción cobertura de seguro / responsabilidad del paciente.

### Seguros (`/features/insurance`)

Gestión de proveedores y pólizas vinculadas a pacientes, con validación de vigencia al asignarlas a facturas.

### Catálogo (`/features/catalog`)

Tablas maestras de servicios médicos y medicamentos con borrado lógico. Los medicamentos exponen el flag `requiresPrescription`.

### Dashboard (`/features/dashboard`)

Métricas operativas: pacientes totales, médicos activos, citas del día, citas próximas, facturas pendientes/vencidas, acumulado cobrado y saldo pendiente. Los accesos rápidos se filtran dinámicamente por rol.

---

## Autenticación y Permisos

### Matriz de roles

| Sección | ADMIN | DOCTOR | RECEPTIONIST |
|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ |
| Pacientes | ✓ | — | ✓ |
| Médicos | ✓ | — | — |
| Citas | ✓ | ✓ | ✓ |
| Completar cita | — | ✓ (propia) | — |
| Facturas | ✓ | — | ✓ |
| Registrar pago | ✓ | — | ✓ |
| Seguros | ✓ | — | — |
| Catálogo | ✓ | — | — |
| Historias clínicas | ✓ | ✓ | ✓ |

### Implementación en tres niveles

1. **Sidebar**: `AppShell` filtra los items de navegación por `roles[]` definidos en `ALL_NAV_ITEMS`.
2. **Rutas**: `beforeLoad` con `requireRole(roles, path)` redirige a `/` si el rol no tiene acceso — previene acceso directo por URL.
3. **Acciones**: `useRolePermissions()` expone flags (`canManageInvoices`, `canRegisterPayments`, etc.) que deshabilitan botones y muestran toast.

### Flujo JWT

```
Login → TokenResponse (accessToken 15min, refreshToken 7d)
         ↓
Request Interceptor → Authorization: Bearer <accessToken>
         ↓
401 recibido → refreshInFlight mutex → POST /auth/refresh
                                        ↓ éxito → retry request original
                                        ↓ fallo  → clearAuthSession → /login
```

---

## HTTP Client

`src/lib/axios.ts` exporta `apiClient` con dos interceptors:

**Request** — Inyecta `Authorization: Bearer <token>` en todas las requests excepto los endpoints de auth.

**Response** — Maneja:
- `401`: refresca el access token con mutex para evitar múltiples llamadas simultáneas. Si falla, limpia sesión y redirige.
- `403`: muestra toast con el mensaje del backend. Debounce de 1500 ms para evitar cascada de toasts.

El base URL se configura con `VITE_API_URL` (default: `http://localhost:8080/api/v1`).

---

## Componentes Showcase

### `AppointmentStatusFlow`

Flujo visual horizontal de la máquina de estados de una cita. Renderiza indicadores de estado activo, flechas de transición y botones de acción (Confirmar, Iniciar, Completar, Cancelar, No Show) habilitados solo para las transiciones válidas desde el estado actual y según el rol. Incluye guardia `isOwnAppointment` para médicos.

### `InvoiceCoverageBar`

Barra proporcional que divide `insuranceCoverage` y `patientResponsibility` sobre el total de la factura. Muestra etiquetas con montos y porcentajes. Maneja casos edge de cobertura 0% y 100%.

### `AllergyAlert`

Banner amber/rojo que aparece en el detalle de cita y en la historia clínica cuando el paciente registra alergias. Cada alergia se renderiza como badge con severidad codificada por color (`mild → yellow`, `moderate → orange`, `severe → red`).

---

## Testing

Suite en dos capas complementarias. Documentación completa en [`docs/02-testing.md`](docs/02-testing.md).

### Unit tests — 614 tests, 49 archivos

Ejecutados con **Vitest 4** + **React Testing Library 16** en entorno `jsdom`.

| Área | Archivos | Descripción |
|---|---|---|
| Utilidades y schemas | 2 | `utils.test.ts`, `mock-utils.test.ts` |
| API functions | 9 | Mock de `apiClient`, verificación de argumentos HTTP |
| API integration | 9 | Tests con datos mock reales del dominio |
| Hooks TanStack Query | 9 | `renderHook`, estados loading / error / data |
| Columnas de tabla | 12 | Formato de celdas, badges, acciones, rendering condicional |
| Componentes showcase | 3 | `AppointmentStatusFlow`, `InvoiceCoverageBar`, `AllergyAlert` |
| Componentes compartidos | 4 | `AppShell`, `DataTable`, `BackToListButton`, `LoginPage` |
| Pages con lógica condicional | 2 | `AppointmentDetailPage`, `InvoiceDetailPage` |
| Auth store | 1 | `authSessionStore` — 21 tests |

Infraestructura en `src/test/`:

| Archivo | Contenido |
|---|---|
| `setup.ts` | Importa `@testing-library/jest-dom/vitest` globalmente |
| `test-utils.tsx` | `customRender` con `QueryClientProvider` (retry: false), `createTestQueryClient` |
| `api-test-utils.ts` | `mockApiClient()` para aislar la capa HTTP |
| `drawer-test-utils.tsx` | Helpers para componentes Radix Sheet / Dialog |

### E2E — 126 tests, 5 archivos

Ejecutados con **Playwright 1.59** sobre Chromium, secuencialmente (`fullyParallel: false`) para reproducibilidad con estado compartido.

| Archivo | Tests | Flujos cubiertos |
|---|---|---|
| `auth-flow.spec.ts` | 27 | Login, logout, permisos por rol, redirección |
| `patients-flow.spec.ts` | 25 | CRUD, búsqueda por DNI, paginación, drawer edición |
| `appointments-flow.spec.ts` | 25 | Transiciones de estado, expedientes, diagnósticos |
| `invoices-flow.spec.ts` | 25 | Confirmación, pagos, cobertura de seguro |
| `role-permissions.spec.ts` | 24 | Acceso por rol: admin, doctor, recepcionista |

---

## Comandos

### Requisitos previos

- Node.js 20+
- Backend corriendo en `http://localhost:8080` (o configurar `VITE_API_URL`)

### Desarrollo

```bash
npm install
npm run dev          # Dev server en http://localhost:5173
```

### Build

```bash
npm run build        # TypeScript check + Vite build
npm run preview      # Preview del build en http://localhost:4173
```

### Unit tests

```bash
npm run test          # Vitest en modo watch
npm run test:run      # Ejecución única (CI)
npm run test:coverage # Con reporte de cobertura HTML en coverage/
npm run test:ui       # UI interactiva de Vitest
```

### E2E

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run e2e            # Playwright headless
npm run e2e:headed     # Con navegador visible

npx playwright show-report   # Reporte HTML tras la ejecución
```

### Linting

```bash
npm run lint
```

---

## Variables de Entorno

| Variable | Default | Descripción |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8080/api/v1` | Base URL del backend |

Crear `.env.local` en la raíz del frontend para sobreescribir en desarrollo local.
