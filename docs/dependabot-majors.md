# Plan de migración de majors de Dependabot

Estado a **2026-11-13**. Este documento planifica los majors que Dependabot
propuso y que se cerraron para no mezclarlos con features. **No se ejecuta
ninguna migración en este bloque**: cada una se hará en una rama y un PR
dedicados.

## 1. Situación actual

| Paquete | Instalado | Último estable | Major pendiente | Tipo |
|---|---:|---:|---|---|
| `jsdom` | 29.0.2 | 31.0.1 | 30 → 31 | dev (entorno de test) |
| `@tanstack/react-table` | 8.21.3 | 9.3.1 | 9 | producción |
| `lucide-react` | 0.577.0 | 1.72.0 | 1 | producción |
| `@types/node` | 24.12.0 | 26.6.6 | 26 | dev (tipos) |

Comprobado contra el registry npm el 2026-11-13. `jsdom 30` ya fue superado por
31; el plan apunta a 31 salvo que aparezca una regresión concreta, en cuyo caso
se fija `30.1.3` y se pospone 31.

Contexto del proyecto:

- Node local y CI: `22.x` (`.nvmrc`); la máquina de desarrollo corre 22.23.4.
- React 19.3, Vite 8.3, Vitest 4.1, TypeScript 5.9.
- `@tanstack/react-table` está centralizado en `src/components/DataTable/index.tsx`;
  las columnas de 11 features solo importan tipos.
- No hay iconos de marca de Lucide (`Github`, `Linkedin`, `Twitter`, etc.) ni uso
  de `LucideIcon` como valor; el riesgo de `lucide-react@1` es bajo.

## 2. Reglas generales

1. Un major por rama/PR. No agrupar dos majors ni mezclarlos con features.
2. Antes de empezar: `git switch main && git pull`, rama
   `chore/deps-<paquete>-<major>`.
3. Gate obligatorio en cada PR: `npm ci`, `npm run lint`,
   `npm run format:check`, `npm run test:coverage`, `npm run build` y E2E
   (`npm run e2e`) si el paquete afecta runtime.
4. Actualizar `package-lock.json` con `npm install <paquete>@<major>`; no editar
   el lock a mano.
5. Revisar el bundle (`npm run build`) y comparar el chunk principal con el
   presupuesto de 500 kB.
6. Rollback: revertir el commit o `npm install <paquete>@<versión-anterior>` y
   restaurar el lock desde `main`.
7. Dependabot puede volver a abrir el PR mientras el major siga permitido. Para
   congelarlo, añadir `ignore` en `.github/dependabot.yml` **solo** si se decide
   posponer; al retomar, quitar la regla.

## 3. Orden recomendado

| Orden | Paquete | Esfuerzo | Riesgo | Motivo |
|---:|---|---|---|---|
| 1 | `@types/node` + runtime Node | 2–4 h | Bajo | Alinear tipos con el runtime antes de tocar test/runtime |
| 2 | `jsdom` | 2–4 h | Bajo | Solo afecta tests unitarios |
| 3 | `lucide-react` | 2–4 h | Bajo | Sin iconos de marca; revisar `aria-hidden` |
| 4 | `@tanstack/react-table` | 1–2 días | Alto | API nueva, tipos y comportamiento de tabla |

Total estimado: **2–3 días** de trabajo efectivo, más una corrida E2E por PR.

## 4. `@types/node` 24 → 26

### Impacto

- Solo tipos: no cambia el runtime. Pero `@types/node` 26 describe APIs de Node
  26 que pueden no existir en Node 22/24.
- Archivos afectados: `tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`,
  `playwright.config.ts` y cualquier uso de `process`, `Buffer`, `fs` o
  `node:*`.
- Hoy ya hay un desfase: runtime 22, tipos 24. El objetivo es que tipos y
  runtime coincidan.

### Estrategia

1. Decidir el runtime objetivo:
   - Mantener Node 22 (LTS actual): fijar `@types/node@^22` (no 26).
   - Subir a Node 24 LTS: actualizar `.nvmrc`, `engines.node`, CI y
     `@types/node@^24`.
   - Node 26 solo cuando sea LTS y esté soportado por Vercel/CI;
     entonces `@types/node@^26`.
2. Si se migra a 26: actualizar `.nvmrc`, `package.json#engines`, workflows que
   usan `node-version-file` y documentación.
3. Ejecutar `npm run build` (tsc) y revisar errores de tipos nuevos/deprecados.
4. No instalar tipos de APIs que el runtime no tenga.

### Tests

`npm run lint`, `npm run format:check`, `npm run test:coverage`,
`npm run build`. E2E no es imprescindible si no cambia runtime, pero conviene
una corrida si se sube Node.

### Riesgos y rollback

- Riesgo principal: que TypeScript acepte una API que Node 22 no tiene y falle
  en producción. Mitigación: alinear tipos con runtime y probar el build de
  Vercel.
- Rollback: restaurar `@types/node@24.12.0` y `.nvmrc` anterior.

## 5. `jsdom` 29 → 31

### Impacto

- Cambio de entorno de tests unitarios exclusivamente; Playwright/E2E no usa
  jsdom.
- jsdom 30 subió el mínimo de Node a `^22.22.2 || ^24.15.0 || >=26.0.0`. El
  proyecto ya corre 22.23.4, pero hay que garantizar que CI resuelva una 22.x
  ≥ 22.22.2 (hoy `setup-node` con `node-version-file` instala la última 22.x).
- Cambios funcionales de 30: `CSS.escape()`/`CSS.supports()`,
  `getComputedStyle()` convierte longitudes a píxeles, serialización CSS y tipo
  de error de `document.evaluate()`. Pueden romper tests que comparan estilos
  calculados o mensajes de error.
- `canvas`/`@napi-rs/canvas` es peer opcional; no se usa canvas en la suite.
- jsdom 31 añade mejoras incrementales; no se esperan cambios de API propios.

### Estrategia

1. `npm install --save-dev jsdom@31`.
2. Verificar `node -v` en local y CI (`>=22.22.2`).
3. Correr la suite completa y buscar fallos por estilos calculados
   (`getComputedStyle`) o por serialización CSS.
4. Si 31 falla por una regresión concreta, fijar `jsdom@30.1.3` y abrir issue
   para 31; no volver a 29.

### Tests

`npm run test:coverage` (obligatorio), `npm run lint`, `npm run build`. E2E no
aplica, pero una corrida de humo no está de más.

### Riesgos y rollback

- Riesgo: tests de accesibilidad/estilos con valores en píxeles distintos.
  Mitigación: ajustar aserciones a valores normalizados, no a strings frágiles.
- Rollback: `npm install --save-dev jsdom@29.0.2`.

## 6. `lucide-react` 0.577 → 1.x

### Impacto

- v1 elimina los **iconos de marca** (Github, Gitlab, Linkedin, Twitter,
  Facebook, Instagram, Slack, Figma, Chrome, etc.). En este repo no se importa
  ninguno, así que no hay reemplazos que hacer.
- v1 elimina el build UMD: Vite usa ESM, sin impacto.
- `aria-hidden="true"` pasa a ser el valor por defecto en los iconos. Es lo
  correcto para iconos decorativos, pero puede cambiar tests que consultan por
  rol/atributos.
- `LucideIcon` pasa a ser un tipo (no un valor). En el repo no se usa.
- v1 reduce el paquete ~32 % (11.4 MB → ~1 MB gzip), lo que puede mejorar el
  bundle.
- Nombres de algunos iconos pueden haber cambiado; el diff de exports de
  0.577 → 1.x no muestra renombres, solo eliminaciones de marca.

### Estrategia

1. `npm install lucide-react@1`.
2. Buscar imports eliminados:
   `grep -rhoE "import \{[^}]+\} from 'lucide-react'" src | ...` y comparar con
   la lista de iconos de marca.
3. Revisar tests que dependan de `aria-hidden` o de `getByRole` sobre iconos.
4. Verificar visualmente las páginas con más iconos (dashboard, navegación,
   tablas) y el bundle.

### Tests

`npm run lint`, `npm run format:check`, `npm run test:coverage`, `npm run build`.
E2E de humo (login + dashboard + una lista) para descartar iconos rotos.

### Riesgos y rollback

- Riesgo bajo. El único riesgo real es un icono de marca no detectado por el
  grep (import dinámico o string). Mitigación: `npm run build` falla si el
  export no existe.
- Rollback: `npm install lucide-react@0.577.0`.

## 7. `@tanstack/react-table` 8 → 9

### Impacto

Es el major de mayor riesgo. v9 es una reescritura con tree-shaking explícito:

- `useReactTable` → `useTable`.
- Nuevo option obligatorio `features` (`tableFeatures({...})` o
  `stockFeatures`); los `get*RowModel()` pasan a slots de `tableFeatures`.
- Tipos con un genérico nuevo `TFeatures`: `ColumnDef<TFeatures, TData, TValue>`,
  `Column`, `Cell`, `Row`, `Table`.
- `sortingFn` → `sortFn`, pinning `left/right` → `start/end`, estado vía
  `table.state`/`table.store`, métodos de fila ya no se pueden desestructurar.
- `onStateChange` eliminado; `enablePinning` dividido.

Puntos de contacto en este repo:

| Archivo | Uso actual |
|---|---|
| `src/components/DataTable/index.tsx` | `useReactTable`, `getCoreRowModel`, `getPaginationRowModel`, `flexRender`, `ColumnDef` |
| `src/components/DataTable/DataTable.test.tsx` | `ColumnDef` |
| `src/features/*/components/*Columns.tsx` (11 archivos) | `ColumnDef` y helpers de columnas |
| Páginas que usan `DataTable` | Paginación y filtros delegan en el componente |

No se usan sorting, grouping, pinning ni selección de filas; el alcance es
core + paginación + filtro manual. Eso reduce la migración.

### Estrategia

1. Rama `chore/deps-react-table-9`.
2. Migración mínima con `stockFeatures` para conservar el comportamiento:
   ```tsx
   import { useTable, stockFeatures, flexRender, type ColumnDef } from '@tanstack/react-table'

   const table = useTable({
     features: stockFeatures,
     data,
     columns,
     state: { pagination },
     onPaginationChange: setPagination,
   })
   ```
3. Si se busca tree-shaking, sustituir `stockFeatures` por
   `tableFeatures({ rowPaginationFeature, paginatedRowModel: createPaginatedRowModel() })`
   y registrar solo lo usado.
4. Adaptar los tipos: crear un alias local
   `type AppColumnDef<T> = ColumnDef<typeof stockFeatures, T, unknown>` para no
   repetir `TFeatures` en 11 archivos, o migrar cada `ColumnDef` al genérico
   nuevo.
5. Mantener `table.getFilteredRowModel().rows.length` solo si el feature de
   filtrado está registrado; si no, usar `table.getRowModel().rows.length`.
6. No usar `useLegacyTable` salvo como paso temporal; eliminarlo antes del
   merge para no cargar todo el bundle legacy.
7. Verificar paginación, filtros, empty state, error state y `DataTable.test`.

### Tests

- `DataTable.test.tsx` y tests de páginas con tablas
  (`PatientsPage`, `DoctorsPage`, `AppointmentsPage`, `InvoicesPage`,
  `PatientDetailPage`, `MedicalRecordDetailPage`).
- `npm run test:coverage`, `npm run build`, `npm run lint`,
  `npm run format:check`.
- E2E completo (`npm run e2e`): las tablas son transversales a todos los flujos.
- Comparar bundle antes/después.

### Riesgos y rollback

- Riesgo alto de regresión funcional (paginación/filtros) y de tipos.
- Mitigación: `stockFeatures` primero (comportamiento V8), optimización de
  features en un PR posterior; E2E obligatorio.
- Rollback: `npm install @tanstack/react-table@8.21.3` y revertir el commit.

## 8. Checklist por PR de major

- [ ] Rama dedicada y un solo paquete.
- [ ] `package.json` + `package-lock.json` actualizados con npm.
- [ ] `npm run lint` y `npm run format:check`.
- [ ] `npm run test:coverage` con los umbrales 41/39/40/42.
- [ ] `npm run build` y comparación de bundle.
- [ ] E2E cuando aplique (jsdom no; lucide y react-table sí).
- [ ] Documentación afectada actualizada (`frontend/README.md`, este archivo).
- [ ] PR con nota de migración, riesgos y rollback.
- [ ] Tras el merge, ejecutar Dependabot o cerrar el PR viejo.

## 9. Decisión de este bloque

No se ejecuta ninguna migración. El orden, el alcance y el rollback quedan
definidos arriba. La próxima sesión de deuda debe empezar por `@types/node`
(alinear runtime) y `jsdom`, y dejar `react-table 9` para una ventana con E2E
completo.
