# SFM Frontend — Sistema de Facturación Médica

Interfaz backoffice para la gestión integral de una clínica: agendamiento de citas con validación de disponibilidad, historias clínicas con diagnósticos ICD-10 y prescripciones, y facturación con cobertura de seguros. Construido sobre React 19 con TypeScript estricto, TanStack Query y TanStack Router.

---

## Stack Tecnológico

| Capa                 | Tecnología                     | Versión    |
| -------------------- | ------------------------------ | ---------- |
| UI Runtime           | React                          | 19.3       |
| Lenguaje             | TypeScript (strict)            | 5.9        |
| Build                | Vite                           | 8.3        |
| Routing              | TanStack Router                | 1.170      |
| Estado del servidor  | TanStack Query                 | 5.106      |
| Tablas               | TanStack Table                 | 8.21       |
| Formularios          | React Hook Form + Zod          | 7.91 + 4.6 |
| Componentes UI       | Shadcn/ui + Radix UI           | —          |
| Estilos              | Tailwind CSS                   | 4.3        |
| HTTP Client          | Axios                          | 1.21       |
| Notificaciones       | Sonner                         | 2.0        |
| Iconos               | Lucide React                   | 0.577      |
| Renderizado Markdown | react-markdown + remark-gfm    | 10.x       |
| Tipografía           | Geist Variable                 | —          |
| Testing unitario     | Vitest + React Testing Library | 4.1 + 16.3 |
| Testing E2E          | Playwright                     | 1.65       |

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
│   ├── dashboard/
│   └── ai/
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

Login, logout y refresh de JWT. Los tokens viven en cookies `httpOnly` y nunca se exponen a JavaScript; el `authSessionStore` solo mantiene `role`, `userId` y `username` para el filtrado de navegación. El interceptor de Axios maneja el ciclo completo: detectar 401 → rotar la cookie una sola vez (`refreshInFlight` + Web Locks entre pestañas) → reintentar la request original → redirigir a login si el refresh falla.

### Pacientes (`/features/patients`)

CRUD con búsqueda por DNI en tiempo real. El detalle incluye historial de citas, facturas, pólizas de seguro y expedientes médicos, cada sección como tabla densa con paginación independiente. Al final del detalle se encuentra el componente `PatientHistoryChat` para consultas en lenguaje natural sobre el historial clínico completo del paciente.

### Médicos (`/features/doctors`)

Listado filtrable por especialidad y estado activo. Drawer de creación/edición con validación de matrícula.

### Citas (`/features/appointments`)

Máquina de estados: `SCHEDULED → CONFIRMED → IN_PROGRESS → COMPLETED`. La creación valida disponibilidad del médico en tiempo real antes de habilitar el submit. `AppointmentStatusFlow` es el componente showcase que renderiza los controles de transición correctos según estado actual y permisos del rol.

### Historias Clínicas (`/features/medical-records`)

Expediente médico con tres secciones: diagnósticos (ICD-10), prescripciones de medicamentos y procedimientos. Se crea automáticamente al completar una cita. Las prescripciones son prerequisito para facturar medicamentos con `requiresPrescription = true`.

Integra dos asistentes AI: el `Icd10Suggester` sugiere códigos mientras el médico escribe en lenguaje coloquial dentro del dialog de diagnóstico; el `ExtractionPanel` analiza las notas clínicas completas y propone diagnósticos, prescripciones y procedimientos en un Sheet con selección por checkbox.

### Facturas (`/features/invoices`)

Máquina de estados `DRAFT → PENDING → PAID / PARTIAL_PAID / OVERDUE / CANCELLED`. El detalle permite agregar/eliminar ítems del catálogo, asignar póliza de seguro con recálculo automático de cobertura, confirmar y registrar pagos. `InvoiceCoverageBar` es el componente showcase que visualiza la proporción cobertura de seguro / responsabilidad del paciente.

En estado `draft`, el botón "Sugerir items" llama al asistente AI que lee el expediente asociado a la factura y propone ítems facturables. Cada sugerencia se agrega individualmente con loading state independiente.

### Seguros (`/features/insurance`)

Gestión de proveedores y pólizas vinculadas a pacientes, con validación de vigencia al asignarlas a facturas.

### Catálogo (`/features/catalog`)

Tablas maestras de servicios médicos y medicamentos con borrado lógico. Los medicamentos exponen el flag `requiresPrescription`.

### Dashboard (`/features/dashboard`)

Métricas operativas: pacientes totales, médicos activos, citas del día, citas próximas, facturas pendientes/vencidas, acumulado cobrado y saldo pendiente. Los accesos rápidos se filtran dinámicamente por rol.

### Integraciones AI (`/features/ai`)

Cuatro asistentes Claude conectados a las páginas de dominio. Siguen el mismo patrón `api/ → hooks/ → components/` del resto del sistema. No tienen datos mock — todas las llamadas van directamente al backend real.

| Integración                  | Endpoint backend                       | Página                    | Componente            |
| ---------------------------- | -------------------------------------- | ------------------------- | --------------------- |
| Sugerencia ICD-10            | `POST /ai/icd10/suggest`               | `MedicalRecordDetailPage` | `Icd10Suggester`      |
| Extracción de notas clínicas | `POST /ai/records/extract`             | `MedicalRecordDetailPage` | `ExtractionPanel`     |
| Consulta de historial        | `POST /ai/patients/{id}/query`         | `PatientDetailPage`       | `PatientHistoryChat`  |
| Sugerencia de ítems          | `POST /ai/invoices/{id}/suggest-items` | `InvoiceDetailPage`       | `ItemSuggestionPanel` |

**`Icd10Suggester`** — Busca códigos ICD-10 por texto libre dentro del dialog de diagnóstico. Muestra hasta 5 sugerencias con código y descripción; al hacer clic rellena automáticamente los campos del formulario.

**`ExtractionPanel`** — Sheet lateral que analiza las notas clínicas del expediente y extrae diagnósticos, prescripciones y procedimientos candidatos. Presenta checkboxes por ítem (todos pre-seleccionados); los ítems con medicamento no resuelto en catálogo quedan deshabilitados. Guarda los seleccionados en paralelo con `Promise.allSettled` e invalida los query keys correspondientes.

**`PatientHistoryChat`** — Interfaz de conversación sobre el historial clínico completo del paciente. El backend conserva memoria por `userId + patientId` en Redis (TTL y N turnos configurables), así que los seguimientos ("¿y desde cuándo?", "¿y la dosis?") mantienen contexto; `DELETE /ai/patients/{id}/conversation` limpia la memoria. Respuestas renderizadas con `react-markdown + remark-gfm`. Las fuentes aparecen como chips clickeables que navegan al expediente médico correspondiente. El primer query puede tardar hasta 10 s adicionales por indexación on-demand.

**`ItemSuggestionPanel`** — Sheet con ítems de factura sugeridos a partir del expediente médico asociado. Solo disponible en estado `draft`. Cada ítem se agrega individualmente con loading state propio; los ítems sin `matchedCatalogId` se muestran deshabilitados.

**Patrones transversales:**

- `useMutation` con `isPending` para todos los estados de carga — ninguna operación bloquea la UI
- Validación Zod en el frontend antes de enviar (queries vacías rechazadas sin llamada HTTP)
- Manejo de errores diferenciado: el hook de sugerencia de ítems lee el status 422 del backend para mostrar el mensaje correcto ("La factura no tiene un expediente médico asociado")
- Latencias esperadas: 2–4 s (ICD-10), 3–6 s (extracción), 3–5 s (ítems), 3–10 s (historial)

---

## Autenticación y Permisos

### Matriz de roles

| Sección            | ADMIN | DOCTOR     | RECEPTIONIST |
| ------------------ | ----- | ---------- | ------------ |
| Dashboard          | ✓     | ✓          | ✓            |
| Pacientes          | ✓     | —          | ✓            |
| Médicos            | ✓     | —          | —            |
| Citas              | ✓     | ✓          | ✓            |
| Completar cita     | —     | ✓ (propia) | —            |
| Facturas           | ✓     | —          | ✓            |
| Registrar pago     | ✓     | —          | ✓            |
| Seguros            | ✓     | —          | —            |
| Catálogo           | ✓     | —          | —            |
| Historias clínicas | ✓     | ✓          | ✓            |

### Implementación en tres niveles

1. **Sidebar**: `AppShell` filtra los items de navegación por `roles[]` definidos en `ALL_NAV_ITEMS`.
2. **Rutas**: `beforeLoad` con `requireRole(roles, path)` redirige a `/` si el rol no tiene acceso — previene acceso directo por URL.
3. **Acciones**: `useRolePermissions()` expone flags (`canManageInvoices`, `canRegisterPayments`, etc.) que deshabilitan botones y muestran toast.

### Flujo JWT

```
Login → cookies httpOnly (sfm_access 15min, sfm_refresh 7d) + SessionResponse
         ↓
Cada request → el navegador adjunta la cookie automáticamente
         ↓
401 recibido → Web Lock entre pestañas + refreshInFlight → POST /auth/refresh
                                        ↓ éxito → cookie rotada → retry original
                                        ↓ fallo  → clearAuthSession → /login
```

---

## HTTP Client

`src/lib/axios.ts` exporta `apiClient` con dos interceptors:

**Request** — No inyecta tokens: el navegador adjunta las cookies `httpOnly`
automáticamente en cada request al mismo origen. Solo normaliza la base `/api/v1`.

**Response** — Maneja:

- `401`: rota la cookie de sesión (Web Locks entre pestañas + ventana de gracia en el backend). Si falla, limpia sesión y redirige.
- `403`: muestra toast con el mensaje del backend. Debounce de 1500 ms para evitar cascada de toasts.

El frontend llama a `/api/v1` en el mismo origen. En desarrollo, Vite reenvía `/api` al backend (`VITE_DEV_API_TARGET`, default `http://127.0.0.1:8080`); en producción lo hace el rewrite de `vercel.json`. Así las cookies `httpOnly` son first-party.

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

### Unit tests — 692 tests, 62 archivos

Ejecutados con **Vitest 4** + **React Testing Library 16** en entorno `jsdom`.

| Área                      | Archivos |
| ------------------------- | -------- |
| Pacientes                 | 10       |
| Citas                     | 7        |
| Auth                      | 7        |
| Facturas                  | 7        |
| Médicos                   | 6        |
| Catálogo                  | 5        |
| Seguros                   | 5        |
| Componentes compartidos   | 5        |
| Historias clínicas        | 4        |
| Dashboard                 | 3        |
| Utilidades y HTTP (`lib`) | 3        |
| **Total**                 | **62**   |

Cobertura real (2026-11-13): **50.23 % statements / 47.72 % branches /
50.00 % functions / 50.98 % lines**. Umbral en `vitest.config.ts`:
**41 / 39 / 40 / 42**. No se baja para destrabar un PR; se sube cuando la
cobertura real mejore.

Infraestructura en `src/test/`:

| Archivo                 | Contenido                                                                        |
| ----------------------- | -------------------------------------------------------------------------------- |
| `setup.ts`              | Importa `@testing-library/jest-dom/vitest` globalmente                           |
| `test-utils.tsx`        | `customRender` con `QueryClientProvider` (retry: false), `createTestQueryClient` |
| `api-test-utils.ts`     | `mockApiClient()` para aislar la capa HTTP                                       |
| `drawer-test-utils.tsx` | Helpers para componentes Radix Sheet / Dialog                                    |

### E2E — 129 tests, 5 archivos

Ejecutados con **Playwright 1.65** sobre Chromium, secuencialmente (`fullyParallel: false`) para reproducibilidad con estado compartido.

| Archivo                     | Tests | Flujos cubiertos                                   |
| --------------------------- | ----- | -------------------------------------------------- |
| `auth-flow.spec.ts`         | 29    | Login, logout, permisos por rol, redirección       |
| `patients-flow.spec.ts`     | 25    | CRUD, búsqueda por DNI, paginación, drawer edición |
| `appointments-flow.spec.ts` | 25    | Transiciones de estado, expedientes, diagnósticos  |
| `invoices-flow.spec.ts`     | 26    | Confirmación, pagos, cobertura de seguro           |
| `role-permissions.spec.ts`  | 24    | Acceso por rol: admin, doctor, recepcionista       |

Estado: **129 passed, 0 skipped** con el seed determinista
`V14__e2e_scenarios.sql`.

---

## Comandos

### Requisitos previos

- Node.js 20+
- Backend corriendo en `http://127.0.0.1:8080` (o configurar `VITE_DEV_API_TARGET`)

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

| Variable              | Default                 | Descripción                               |
| --------------------- | ----------------------- | ----------------------------------------- |
| `VITE_DEV_API_TARGET` | `http://127.0.0.1:8080` | Destino del proxy `/api` en dev y preview |

Crear `.env.local` en la raíz del frontend para sobreescribir en desarrollo local.
