# Setup del Proyecto Frontend

## Descripcion General

Frontend del Sistema de Facturación Médica (SFM), un backoffice EHR Lite orientado a clínicas privadas.

La interfaz sigue el paradigma de backoffice denso: tablas paginadas, formularios en drawers laterales, sidebar fija y modo claro permanente.

---

## Creacion del Proyecto

El proyecto base se generó con Vite usando la plantilla oficial de React + TypeScript:

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

Esto produce la estructura mínima de Vite con `vite.config.ts`, `tsconfig.app.json`, `tsconfig.json` (root), `src/main.tsx` y `src/App.tsx`.

---

## Stack Tecnologico

| Tecnología | Version | Rol |
|---|---|---|
| React | 19.x | UI framework |
| TypeScript | 5.9.x | Tipado estricto |
| Vite | 8.x | Build tool y dev server |
| TanStack Query v5 | 5.x | Estado del servidor (fetch, cache, sync) |
| TanStack Router | 1.x | Routing type-safe (code-based) |
| TanStack Table | 8.x | Tablas genéricas con `ColumnDef<T>[]` |
| React Hook Form | 7.x | Formularios |
| Zod | 4.x | Validación de esquemas |
| Shadcn/ui | 4.x | Componentes UI basados en Radix |
| Tailwind CSS | 4.x | Utilidades CSS |
| Axios | 1.x | Cliente HTTP |
| Sonner | 2.x | Notificaciones (toasts) |
| Geist Variable | 5.x | Tipografía |

---

## Instalacion de Dependencias

### Dependencias principales

```bash
npm install \
  @tanstack/react-query \
  @tanstack/react-query-devtools \
  @tanstack/react-router \
  @tanstack/react-table \
  react-hook-form \
  @hookform/resolvers \
  zod \
  axios \
  sonner \
  @fontsource-variable/geist
```

### Shadcn/ui

Shadcn no es una librería instalable via npm tradicional; es una CLI que copia componentes directamente al proyecto. La versión 4.x usa el preset `nova` de Radix y requiere Tailwind v4.

```bash
npx shadcn@latest init -b radix -p nova --template vite -y
```

Este comando instala automáticamente:
- `radix-ui` (primitivos accesibles)
- `class-variance-authority` (variantes de componentes)
- `clsx` + `tailwind-merge` (composición de clases)
- `lucide-react` (iconos)
- `tw-animate-css` (animaciones CSS)
- `vaul` (drawer)
- `next-themes` (soporte de temas)

También genera `components/ui/` con los primeros componentes base.

### Tailwind v4 como devDependency

Shadcn 4.x instala Tailwind v4 pero lo ubica incorrectamente. Verificar que en `package.json` se encuentre en `devDependencies`:

```bash
npm install --save-dev tailwindcss @tailwindcss/vite
```

---

## Archivos de Configuracion

### `vite.config.ts`

Registro del plugin de Tailwind v4 y el alias de path `@/` que apunta a `./src/`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

El plugin `@tailwindcss/vite` reemplaza completamente la cadena PostCSS de Tailwind v3. Ya no se necesita `postcss.config.js` ni `tailwind.config.js`.

Para que TypeScript resuelva `path`, es necesario instalar los tipos de Node:

```bash
npm install --save-dev @types/node
```

### `tsconfig.app.json`

Configuracion de TypeScript en modo estricto completo. El alias `@/*` debe declararse aquí para que el compilador resuelva los imports:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,

    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

Flags de linting relevantes:

| Flag | Efecto |
|---|---|
| `strict` | Activa `strictNullChecks`, `noImplicitAny` y todos los checks del grupo strict |
| `noUnusedLocals` | Error en variables locales declaradas pero no usadas |
| `noUnusedParameters` | Error en parámetros de función no usados |
| `erasableSyntaxOnly` | Prohíbe `enum` y `namespace` no erasables; fuerza el uso de `type` |
| `verbatimModuleSyntax` | Requiere `import type` explícito en imports de tipos |

### `tsconfig.json` (root)

El archivo raíz también debe declarar el alias. Sin esto, shadcn CLI falla al inicializarse con el error `No import alias found in tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### `src/index.css`

Tailwind v4 abandona el enfoque de directivas (`@tailwind base`, `@tailwind components`, `@tailwind utilities`) en favor de un import CSS nativo. El archivo centraliza cuatro responsabilidades:

**1. Imports de Tailwind y plugins:**
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "@fontsource-variable/geist";
```

**2. Mapeo de variables CSS a utilidades de Tailwind (`@theme inline`):**

Shadcn genera las variables CSS del tema (como `--primary`, `--border`, `--ring`) pero Tailwind v4 no las conoce como utilidades (`bg-primary`, `border-border`) a menos que se mapeen explícitamente. El bloque `@theme inline` hace ese puente:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-border: var(--border);
  --color-ring: var(--ring);
  /* ... resto de variables ... */
  --font-sans: 'Geist Variable', ui-sans-serif, system-ui, sans-serif;
}
```

**3. Definicion del tema (variables CSS):**

```css
@layer base {
  :root {
    --primary: oklch(0.489 0.177 204.85); /* cyan-600 — acento del proyecto */
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    /* ... todas las variables del tema ... */
  }
}
```

El acento cyan-600 se aplica a botones primarios, links, estados activos del sidebar y badges de estado.

**4. Estilos base:**
```css
* {
  @apply border-border outline-ring/50;
}
body {
  @apply bg-background text-foreground;
  font-feature-settings: "rlig" 1, "calt" 1;
}
```

---

## Estructura de Carpetas de `src/`

```
src/
├── api/                  # Clientes Axios por dominio (patientApi, appointmentApi...)
│                         # Cada función espeja el nombre del servicio Java:
│                         # getPatients, createPatient, updatePatient...
│
├── components/           # Componentes reutilizables compartidos
│   └── ui/               # Generados por shadcn CLI (Button, Input, Table, etc.)
│
├── features/             # Módulos por dominio del backend
│   ├── patients/         # Cada feature contiene:
│   │   ├── api/          #   → funciones de acceso a datos del dominio
│   │   ├── components/   #   → componentes específicos del dominio
│   │   └── hooks/        #   → hooks de TanStack Query del dominio
│   ├── appointments/
│   ├── invoices/
│   ├── medical-records/
│   └── catalog/
│
├── hooks/                # Hooks custom compartidos entre features
│
├── lib/                  # Infraestructura compartida
│   ├── axios.ts          # Instancia de Axios con interceptors
│   ├── queryClient.ts    # Instancia de QueryClient con defaults
│   └── mock-utils.ts     # Simulacion de delay y paginacion en memoria
│
├── mocks/                # Datos mock que espajan V5__seeds.sql del backend
│
├── routes/               # Definicion de rutas con TanStack Router
│
├── types/                # Tipos TypeScript espejo de los DTOs del backend Java
│
├── routeTree.gen.tsx     # Árbol de rutas (code-based, no file-based)
├── main.tsx              # Punto de entrada: providers y montaje del DOM
└── index.css             # Estilos globales y tema de Tailwind v4
```

---

## Providers y Punto de Entrada

`src/main.tsx` envuelve la aplicación en tres providers en este orden:

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>,
)
```

| Provider | Proposito |
|---|---|
| `StrictMode` | Doble render en desarrollo para detectar efectos secundarios |
| `QueryClientProvider` | Contexto global de TanStack Query |
| `RouterProvider` | Monta el router de TanStack Router |
| `Toaster` | Notificaciones en la esquina superior derecha |
| `ReactQueryDevtools` | Solo en desarrollo: inspector de cache de queries |

### `src/lib/queryClient.ts`

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,       // 30 segundos antes de considerar stale
      retry: 1,                    // un reintento en caso de error
      refetchOnWindowFocus: false, // no refetch al volver al tab
    },
  },
})
```

### `src/lib/axios.ts`

Instancia global de Axios configurada con la URL base del backend y un interceptor que inyecta un token mock en cada request:

```typescript
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  config.headers.Authorization = 'Bearer mock-token-dev'
  return config
})
```

Cuando el backend esté disponible, el interceptor se reemplazará para leer el token JWT real desde localStorage.

---

## Routing: TanStack Router Code-Based

TanStack Router soporta dos modos: file-based (con plugin de Vite que genera el árbol de rutas automáticamente) y code-based (manual). Se eligió **code-based** porque el plugin `@tanstack/router-vite-plugin` no fue instalado.

El árbol de rutas reside en `src/routeTree.gen.tsx` (`.tsx`, no `.ts`, porque contiene JSX):

```tsx
import { createRouter, createRootRoute, createRoute, Outlet } from '@tanstack/react-router'

const rootRoute = createRootRoute({ component: () => <Outlet /> })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Index,
})

const routeTree = rootRoute.addChildren([indexRoute])
export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
```

Al agregar features, cada ruta nueva se define aquí con `createRoute` y se agrega a `addChildren`.

**Estructura de rutas planificada:**

```
/                          → Dashboard
/patients                  → Lista de pacientes
/patients/$id              → Detalle del paciente
/patients/$id/appointments → Citas del paciente (sub-ruta)
/patients/$id/records      → Expedientes del paciente (sub-ruta)
/appointments              → Lista de citas
/appointments/$id          → Detalle de cita
/invoices                  → Lista de facturas
/invoices/$id              → Detalle de factura
/catalog                   → Catálogo de servicios y medicamentos
```

Los formularios de creacion y edicion se abren como **drawers laterales** desde la misma ruta de la lista. No hay rutas `/new` ni `/edit/:id`.

---

## Decisiones de Arquitectura

### DataTable genérica

Todas las listas del sistema usan un único componente `DataTable<T>` construido sobre TanStack Table. La definición de columnas se pasa como `ColumnDef<T>[]` específica de cada dominio:

```typescript
// Ejemplo de uso
<DataTable
  columns={patientColumns}
  data={patients}
/>
```

### Formularios en Drawers

Los formularios de creacion y edicion se montan dentro de un `Sheet` (drawer lateral de shadcn). El estado de apertura y el id a editar se mantienen como estado local del componente lista, no en la URL. Esto simplifica el routing y evita que el usuario pierda contexto al editar.

### Paginacion en Cliente

Sin backend activo, la paginacion se simula en memoria con `paginateArray<T>` de `src/lib/mock-utils.ts`. Esta funcion recibe el array completo y devuelve un `PageResponse<T>` idéntico a lo que devolvería la API real. Cuando el backend esté disponible, solo se reemplaza la función de fetch; la interfaz no cambia.

```typescript
export function paginateArray<T>(items: T[], page = 0, size = 20): PageResponse<T> {
  const totalElements = items.length
  const totalPages = Math.ceil(totalElements / size)
  const start = page * size
  const content = items.slice(start, start + size)
  return { content, totalElements, totalPages, number: page, size,
           first: page === 0, last: page >= totalPages - 1, empty: content.length === 0 }
}
```

### Simulacion de Latencia

Todas las funciones mock incluyen un delay aleatorio para simular la latencia real de la red y observar correctamente los estados de loading de TanStack Query:

```typescript
export function mockDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.random() * 400 + 200))
}
```

El rango 200-600ms es suficiente para que los skeleton loaders sean visibles sin entorpecer el desarrollo.

---

## Problemas Encontrados y Soluciones

### shadcn: opcion `--base-color` desconocida

**Sintoma**

```
error: unknown option '--base-color'
```

El error aparece al intentar inicializar shadcn con flags de documentación obsoleta.

**Causa raiz**

La CLI de shadcn@4.x cambió la interfaz de `init`. Los flags `--base-color` y `--preset` de versiones anteriores fueron reemplazados.

**Solucion**

```bash
# Incorrecto (flags de shadcn <4.x)
npx shadcn@latest init --base-color slate --preset nova

# Correcto (shadcn 4.x)
npx shadcn@latest init -b radix -p nova --template vite -y
```

Los flags actuales son: `-b` (biblioteca de primitivos: `radix`), `-p` (preset: `nova`), `--template` (plantilla del proyecto), `-y` (responde yes a todas las preguntas).

---

### shadcn: `No import alias found in tsconfig.json`

**Sintoma**

```
No import alias found in tsconfig.json
```

La CLI de shadcn se detiene sin inicializar y no genera ningún archivo.

**Causa raiz**

Shadcn busca el alias `@/*` en el archivo `tsconfig.json` de la raíz del proyecto, no en `tsconfig.app.json`. Vite, por su parte, aplica el alias desde `vite.config.ts`. Son dos sistemas independientes: uno para la CLI de shadcn y otro para el compilador de TypeScript en modo proyecto-referenciado.

**Solucion**

Agregar `compilerOptions.paths` al `tsconfig.json` raíz además de en `tsconfig.app.json`:

```json
// tsconfig.json (raiz del proyecto)
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

### `border-border` class does not exist — Conflicto Tailwind v3 vs v4

**Sintoma**

```
The `border-border` class does not exist.
```

El error aparece en el CSS compilado. Los componentes de shadcn renderizan sin bordes ni colores correctos.

**Causa raiz**

Shadcn@4.x genera componentes que usan utilidades como `border-border`, `bg-background`, `text-foreground`. Estas utilidades solo existen si Tailwind conoce las variables CSS del tema como tokens de color con el prefijo `--color-*`.

Tailwind v3 esperaba que estos tokens se declararan en `tailwind.config.js` bajo `theme.extend.colors`. Tailwind v4, en cambio, los lee de un bloque `@theme` en CSS. El proyecto fue generado inicialmente con Tailwind v3 (instalado por defecto por Vite), por lo que `shadcn/tailwind.css` generaba las variables CSS pero Tailwind no las registraba como utilidades.

**Solucion: migración completa a Tailwind v4**

1. Desinstalar Tailwind v3 y PostCSS:
```bash
npm uninstall tailwindcss postcss autoprefixer
rm tailwind.config.js postcss.config.js
```

2. Instalar Tailwind v4 con el plugin de Vite:
```bash
npm install --save-dev tailwindcss @tailwindcss/vite
```

3. Configurar el plugin en `vite.config.ts`:
```typescript
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

4. Agregar el bloque `@theme inline` en `src/index.css` para mapear cada variable CSS a una utilidad de Tailwind:
```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-border: var(--border);
  --color-ring: var(--ring);
  /* ... una línea por cada variable del tema ... */
}
```

Sin este bloque, Tailwind v4 no registra las variables de shadcn como utilidades. Con él, `border-border` se traduce a `border-color: var(--border)` correctamente.

---

### JSX en archivo `.ts` — TanStack Router

**Sintoma**

```
error TS17004: Cannot use JSX unless the '--jsx' flag is provided.
```

El error aparece en `src/routeTree.gen.ts` al intentar usar `<Outlet />`.

**Causa raiz**

TanStack Router requiere JSX en el archivo del árbol de rutas porque los componentes de ruta son elementos React. TypeScript no permite JSX en archivos `.ts`; solo en `.tsx`.

**Solucion**

Renombrar el archivo a `routeTree.gen.tsx` y actualizar el import en `main.tsx`:

```tsx
// main.tsx — con extension explicita para que Vite resuelva el archivo correcto
import { router } from '@/routeTree.gen.tsx'
```

---

### TanStack Router: `createFileRoute` — Routing File-Based vs Code-Based

**Sintoma**

```
TypeError: Cannot destructure property 'path' of 'undefined'
```

Errores de tipos en las definiciones de ruta cuando se usa `createFileRoute`.

**Causa raiz**

`createFileRoute` es la API del modo **file-based**: cada archivo en `src/routes/` se convierte automáticamente en una ruta y el plugin `@tanstack/router-vite-plugin` genera el árbol a partir de la estructura de directorios. Sin el plugin instalado, `createFileRoute` no funciona porque depende de transformaciones en tiempo de build.

**Solucion**

Usar el modo **code-based** con `createRootRoute` + `createRoute` + `addChildren`. Todo el árbol de rutas se define manualmente en `src/routeTree.gen.tsx`:

```tsx
import { createRouter, createRootRoute, createRoute, Outlet } from '@tanstack/react-router'

const rootRoute = createRootRoute({ component: () => <Outlet /> })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/' })
const routeTree = rootRoute.addChildren([indexRoute])
export const router = createRouter({ routeTree })
```

El modo code-based requiere más código pero es explícito, sin magia, y funciona sin dependencias adicionales.
