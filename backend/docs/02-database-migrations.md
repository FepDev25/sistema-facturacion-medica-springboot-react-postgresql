# Migraciones de Base de Datos

## Herramienta: Flyway

El proyecto utiliza Flyway para gestionar el esquema de la base de datos mediante migraciones versionadas. Cada migracion es un archivo SQL numerado que Flyway ejecuta en orden estricto y registra en la tabla interna `flyway_schema_history`. Una migracion ejecutada jamas se vuelve a ejecutar.

---

## Principio de Diseno: Logica en la Aplicacion

Los scripts SQL originales del directorio `database/` incluian triggers para automatizar validaciones (pagos, prescripciones, conflictos de agenda, etc.). En este proyecto, **todos los triggers de logica de negocio han sido eliminados** de las migraciones. Las razones son:

- Las validaciones son visibles, testeables y mantenibles en Java.
- Los errores de negocio se traducen a respuestas HTTP claras desde el `@RestControllerAdvice`.
- El comportamiento transaccional queda bajo control explicito de `@Transactional` en la capa de servicio.

Los unicos elementos de base de datos que permanecen son: definicion de tablas, constraints declarativos, indices y la extension `btree_gist` requerida por el exclusion constraint de citas.

---

## Estructura de Directorios

```
src/main/resources/
  db/
    migration/           # Migraciones que corren en todos los perfiles
      V1__init_extensions.sql
      V2__create_schema.sql
      V3__catalog_price_history.sql
      V4__constraints_and_indexes.sql
    seeds/               # Solo se carga en el perfil dev
      V5__seeds.sql
```

---

## Detalle de Cada Migracion

### V1 - Inicializacion de Extensiones

**Archivo:** `V1__init_extensions.sql`

Habilita las extensiones de PostgreSQL requeridas por el sistema:

| Extension | Proposito |
|---|---|
| `uuid-ossp` | Generacion de identificadores UUID v4 para todas las claves primarias. |
| `pgcrypto` | Funciones criptograficas para hashing de datos sensibles. |

Debe ejecutarse antes que cualquier otra migracion porque las tablas dependen de `uuid_generate_v4()`.

---

### V2 - Esquema Principal

**Archivo:** `V2__create_schema.sql`

Crea las 14 tablas del modelo de dominio con sus constraints, indices y comentarios de documentacion.

**Tablas creadas:**

| Tabla | Descripcion |
|---|---|
| `patients` | Pacientes registrados. DNI unico obligatorio. |
| `doctors` | Personal medico. Numero de licencia unico. |
| `insurance_providers` | Aseguradoras medicas. Codigo unico. |
| `insurance_policies` | Polizas de seguro vinculadas a pacientes. |
| `appointments` | Citas medicas con maquina de estados. |
| `medical_records` | Expediente clinico por consulta. |
| `medications_catalog` | Catalogo de medicamentos con flag de prescripcion. |
| `prescriptions` | Recetas medicas emitidas en una consulta. |
| `diagnoses` | Diagnosticos con codigo ICD-10. |
| `services_catalog` | Catalogo de servicios medicos por categoria. |
| `procedures` | Procedimientos realizados durante consultas. |
| `invoices` | Facturas con calculo de cobertura de seguro. |
| `invoice_items` | Lineas de detalle de cada factura. |
| `payments` | Pagos aplicados a facturas. |

**Constraints declarativos relevantes:**

- `chk_appointments_status`: restringe los estados validos de una cita a `scheduled`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`.
- `chk_invoices_status`: restringe los estados de factura a `draft`, `pending`, `partial_paid`, `paid`, `cancelled`, `overdue`.
- `chk_invoices_total_calculation`: verifica que `total = subtotal + tax`.
- `chk_invoice_items_subtotal_calculation`: verifica que `subtotal = quantity * unit_price`.
- `chk_invoice_items_reference`: garantiza coherencia entre `item_type` y la FK utilizada.
- `chk_insurance_policies_coverage`: restringe `coverage_percentage` al rango 0-100.

**Integridad referencial:**

- `ON DELETE RESTRICT` en pacientes, medicos y aseguradoras: no se pueden eliminar si tienen registros dependientes.
- `ON DELETE CASCADE` en `invoice_items`: si se elimina una factura, se eliminan sus lineas.
- `ON DELETE SET NULL` en `invoices.insurance_policy_id`: si se elimina la poliza, la factura queda sin seguro pero persiste.

---

### V3 - Tabla de Historial de Precios

**Archivo:** `V3__catalog_price_history.sql`

Crea la tabla `catalog_price_history` que registra cada cambio de precio en los catalogos de servicios y medicamentos (RN-18).

**Columnas principales:**

| Columna | Tipo | Descripcion |
|---|---|---|
| `catalog_type` | VARCHAR(20) | Valor `service` o `medication`. |
| `catalog_id` | UUID | Referencia al item del catalogo cuyo precio cambio. |
| `old_price` | NUMERIC(10,2) | Precio anterior al cambio. |
| `new_price` | NUMERIC(10,2) | Precio nuevo tras el cambio. |
| `changed_at` | TIMESTAMPTZ | Fecha y hora del cambio en UTC. |

La tabla es de solo insercion. La logica que escribe en ella se implementa en el servicio correspondiente (`ServicesCatalogService`, `MedicationsCatalogService`) dentro de la misma transaccion que actualiza el precio.

---

### V4 - Constraints Adicionales e Indices

**Archivo:** `V4__constraints_and_indexes.sql`

Aplica las correcciones y optimizaciones identificadas en la auditoria del esquema original.

**Cambios estructurales:**

**`invoice_sequences`** — tabla nueva para la generacion de numeros de factura sin condiciones de carrera. La capa de aplicacion usa `SELECT ... FOR UPDATE` sobre esta tabla dentro de cada transaccion de creacion de factura para garantizar unicidad del numero `FAC-YYYY-NNNNN`.

**`uq_medical_records_appointment`** — constraint UNIQUE sobre `medical_records.appointment_id`. Garantiza que una cita genera exactamente un expediente clinico (RN-05).

**`chk_invoices_responsibility_sum`** — reemplaza el constraint original por uno con tolerancia de `$0.01` para evitar falsos positivos por redondeo en operaciones con numeros decimales.

**Extension `btree_gist`** — requerida para el exclusion constraint de citas solapadas.

**`excl_appointments_doctor_overlap`** — exclusion constraint que impide que un medico tenga dos citas cuyas ventanas de tiempo se superpongan (excepto citas `cancelled` o `no_show`). La capa de aplicacion realiza esta validacion antes de persistir para devolver un mensaje claro; este constraint actua como salvaguarda ante condiciones de carrera.

**`invoices.appointment_id` ahora opcional** — permite crear facturas para servicios de emergencia sin cita previa. Se agrega la columna `notes` y el constraint `chk_invoices_requires_reference` que obliga a que exista `appointment_id` o `notes` en cada factura.

**Indices adicionales:**

| Indice | Tabla | Proposito |
|---|---|---|
| `idx_appointments_patient_scheduled` | `appointments` | Consultas de agenda de paciente. |
| `idx_diagnoses_icd10_patient` | `diagnoses` | Busqueda de diagnosticos por codigo ICD-10. |
| `idx_catalog_price_history_type_id` | `catalog_price_history` | Historial de precios por tipo e ID. |
| `idx_patients_allergies_gin` | `patients` | Full-text search en campo `allergies` (critico para prescripciones). |
| `idx_medications_name_gin` | `medications_catalog` | Full-text search por nombre de medicamento. |
| `idx_services_name_gin` | `services_catalog` | Full-text search por nombre de servicio. |

---

### V5 - Seeds de Datos de Prueba

**Archivo:** `db/seeds/V5__seeds.sql`

**Solo se ejecuta en el perfil `dev`.**

Contiene datos realistas para desarrollo y testing manual:

- 10 pacientes con datos demograficos variados, algunos con alergias documentadas.
- Medicos de distintas especialidades.
- Aseguradoras y polizas con distintos porcentajes de cobertura.
- Citas en diferentes estados.
- Expedientes clinicos con diagnosticos ICD-10, prescripciones y procedimientos.
- Facturas con y sin cobertura de seguro, en distintos estados.
- Pagos parciales y totales.

El script inicia con `TRUNCATE ... CASCADE` sobre todas las tablas en orden inverso de dependencias para garantizar un estado limpio cada vez que se ejecuta en desarrollo.

> Este archivo nunca debe incluirse en los perfiles `docker` ni `test`.

---

## Convencion de Nombres

Flyway requiere el siguiente formato para los archivos de migracion:

```
V{version}__{descripcion}.sql
```

- `V` mayuscula seguida del numero de version.
- Doble guion bajo (`__`) como separador obligatorio.
- Descripcion en minusculas con guiones bajos como separadores de palabras.
- Extension `.sql`.

Una vez que Flyway ejecuta una migracion, su checksum queda registrado. **Nunca modificar un archivo de migracion ya ejecutado.** Si es necesario corregir algo, crear una nueva migracion con el siguiente numero de version.

---

## Comandos Utiles

Verificar el estado de las migraciones sin ejecutarlas:

```bash
./mvnw flyway:info -Dspring-boot.run.profiles=dev
```

Ejecutar migraciones pendientes manualmente:

```bash
./mvnw flyway:migrate -Dspring-boot.run.profiles=dev
```

Limpiar completamente la base de datos (solo desarrollo):

```bash
docker compose down -v
docker compose up -d
```

Al reiniciar el backend, Flyway re-ejecutara todas las migraciones desde V1.
