# Problemas Conocidos y Soluciones

Registro de errores no obvios encontrados durante la integracion del proyecto. Cada entrada describe el sintoma, la causa raiz y la solucion aplicada.

---

## Spring Boot 4.0

### Flyway no ejecuta las migraciones al arrancar

**Sintoma**

La aplicacion inicia sin errores pero la base de datos queda vacia. El log no muestra ninguna linea de Flyway ejecutando scripts.

**Causa raiz**

En Spring Boot 4.0, la auto-configuracion de Flyway fue extraida del modulo `spring-boot-autoconfigure` a un modulo dedicado: `spring-boot-flyway`. Este modulo no es una dependencia transitiva de `flyway-core`, por lo que agregar solo `flyway-core` al `pom.xml` no es suficiente para activar la integracion automatica.

Se puede verificar este comportamiento inspeccionando el JAR de auto-configuracion:

```bash
jar tf ~/.m2/repository/org/springframework/boot/spring-boot-autoconfigure/4.0.x/spring-boot-autoconfigure-4.0.x.jar \
  | grep -i flyway
# No produce ninguna salida
```

**Solucion**

Reemplazar la dependencia directa de `flyway-core` por el starter de Spring Boot, que incluye el modulo de auto-configuracion:

```xml
<!-- Incorrecto en Spring Boot 4.0 -->
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>

<!-- Correcto -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-flyway</artifactId>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
</dependency>
```

El segundo artefacto (`flyway-database-postgresql`) es requerido desde Flyway 10 para el soporte especifico de PostgreSQL. Sin el, Flyway no reconoce el driver.

---

## PostgreSQL / SQL

### Funcion en expresion de indice no es IMMUTABLE

**Sintoma**

```
ERROR: functions in index expression must be marked IMMUTABLE
```

El error aparece al intentar crear un indice o un exclusion constraint cuya expresion utiliza la suma de un `TIMESTAMPTZ` con un `INTERVAL`.

**Causa raiz**

El operador `timestamptz + interval` en PostgreSQL tiene volatilidad `STABLE`, no `IMMUTABLE`. La razon es que la conversion de intervalos a timestamps absolutos depende del timezone de sesion para calcular correctamente las transiciones de horario de verano (DST). PostgreSQL no permite expresiones `STABLE` en indices porque no puede garantizar que el resultado sea identico entre sesiones distintas.

Esto aplica a cualquier variante de la suma, incluyendo:

```sql
-- Ambas formas tienen volatilidad STABLE
scheduled_at + duration_minutes * INTERVAL '1 minute'
scheduled_at + (duration_minutes || ' minutes')::INTERVAL
```

**Solucion**

Almacenar el tiempo de fin calculado en una columna dedicada `scheduled_end_at TIMESTAMPTZ`. La capa de aplicacion (`AppointmentService`) calcula y persiste este valor al crear o modificar una cita. El indice de solapamiento referencia directamente la columna almacenada:

```sql
ALTER TABLE appointments ADD COLUMN scheduled_end_at TIMESTAMPTZ;

CREATE INDEX idx_appointments_doctor_schedule
ON appointments(doctor_id, scheduled_at, scheduled_end_at)
WHERE status NOT IN ('cancelled', 'no_show');
```

Los seeds deben poblar esta columna explicitamente:

```sql
UPDATE appointments
SET scheduled_end_at = scheduled_at + duration_minutes * INTERVAL '1 minute'
WHERE scheduled_end_at IS NULL;
```

---

### Indice GIN con to_tsvector falla por volatilidad

**Sintoma**

```
ERROR: functions in index expression must be marked IMMUTABLE
```

El error ocurre al crear un indice GIN con `to_tsvector` pasando el idioma como texto literal.

**Causa raiz**

`to_tsvector` tiene dos sobrecargas:

| Firma | Volatilidad |
|---|---|
| `to_tsvector(text, text)` | `STABLE` |
| `to_tsvector(regconfig, text)` | `IMMUTABLE` |

Al escribir `to_tsvector('spanish', texto)` sin cast, PostgreSQL resuelve la sobrecarga `(text, text)` que es `STABLE` porque requiere consultar la tabla del sistema `pg_ts_config` en runtime. Esta sobrecarga no puede usarse en expresiones de indice.

**Solucion**

Forzar la sobrecarga `IMMUTABLE` mediante un cast explicito a `regconfig`:

```sql
-- Incorrecto (resuelve la sobrecarga STABLE)
CREATE INDEX idx_patients_allergies_gin
ON patients USING GIN(to_tsvector('spanish', COALESCE(allergies, '')));

-- Correcto (resuelve la sobrecarga IMMUTABLE)
CREATE INDEX idx_patients_allergies_gin
ON patients USING GIN(to_tsvector('spanish'::regconfig, COALESCE(allergies, '')))
WHERE allergies IS NOT NULL;
```

---

### UUID con caracteres hexadecimales invalidos

**Sintoma**

```
ERROR: invalid input syntax for type uuid: "g0000000-0000-0000-0000-000000000001"
```

**Causa raiz**

El formato UUID solo acepta los caracteres `0-9` y `a-f`. Las letras `g` hasta `z` son invalidas en cualquier posicion. Los datos de prueba usaban prefijos alfabeticos como `g`, `h`, `i`, `j`, `k`, `l` para diferenciar visualmente grupos de entidades.

**Solucion**

Reemplazar los prefijos invalidos por valores hexadecimales validos y distintos entre si:

| Prefijo original | Reemplazo aplicado | Entidad |
|---|---|---|
| `g0000000-...` | `10000000-...` | appointments |
| `h0000000-...` | `20000000-...` | medical_records |
| `i0000000-...` | `30000000-...` | diagnoses |
| `j0000000-...` | `40000000-...` | prescriptions |
| `k0000000-...` | `50000000-...` | procedures |
| `l0000000-...` | `60000000-...` | invoices |

---

### invoice_number nulo al eliminar triggers

**Sintoma**

```
ERROR: null value in column "invoice_number" of relation "invoices" violates not-null constraint
```

**Causa raiz**

El esquema original generaba el numero de factura (`FAC-YYYY-NNNNN`) mediante un trigger `BEFORE INSERT`. Al eliminar todos los triggers del proyecto y trasladar la logica a la capa de aplicacion, los seeds que usaban `NULL` en esa columna dejaron de funcionar porque ningun trigger los populaba.

**Solucion**

Proveer los numeros de factura explicitamente en los seeds y registrar el ultimo numero utilizado en la tabla `invoice_sequences` para que la aplicacion continue la secuencia correctamente:

```sql
INSERT INTO invoices (id, invoice_number, ...) VALUES
('...', 'FAC-2026-00001', ...),
('...', 'FAC-2026-00002', ...);

INSERT INTO invoice_sequences (year, last_sequence) VALUES (2026, 10)
ON CONFLICT (year) DO UPDATE SET last_sequence = EXCLUDED.last_sequence;
```

---

### service_id invalido en filas de tipo medication en invoice_items

**Sintoma**

```
ERROR: invalid input syntax for type uuid: "FAC-2026-00001"
```

**Causa raiz**

La tabla `invoice_items` tiene dos columnas de referencia opcionales: `service_id` (FK a `services_catalog`) y `medication_id` (FK a `medications_catalog`). Para filas de tipo `medication`, `service_id` debe ser `NULL`. Los seeds tenian el numero de factura (`FAC-2026-NNNNN`) en la posicion de `service_id` en lugar de `NULL`, lo que provocaba que PostgreSQL intentara parsear ese string como UUID.

**Solucion**

Asignar `NULL` a `service_id` en todas las filas de tipo `medication`:

```sql
-- Incorrecto
('invoice-uuid', 'FAC-2026-00001', 'medication-uuid', 'medication', ...),

-- Correcto
('invoice-uuid', NULL,             'medication-uuid', 'medication', ...),
```

El constraint `chk_invoice_items_reference` del esquema valida que la combinacion de `item_type`, `service_id` y `medication_id` sea coherente en cada fila.
