# Repositorios Spring Data JPA

Referencia de patrones de repositorios usados en este proyecto. Cubre queries derivadas, JPQL, bloqueos, paginacion y decisiones de diseno.

---

## Estructura Base

Todo repositorio extiende `JpaRepository<Entidad, TipoPK>`. Esto provee automaticamente: `findById`, `findAll`, `save`, `delete`, `existsById`, `count` y sus variantes paginadas.

```java
@Repository
public interface PatientRepository extends JpaRepository<Patient, UUID> {
    // metodos adicionales aqui
}
```

`@Repository` es opcional si extiende `JpaRepository`, pero es buena practica incluirla para legibilidad.

La PK suele ser `UUID`. Excepcion: `InvoiceSequenceRepository` usa `Integer` porque la PK es el año.

```java
public interface InvoiceSequenceRepository extends JpaRepository<InvoiceSequence, Integer> { }
```

---

## Queries Derivadas

Spring Data JPA lee el nombre del metodo y genera el SQL automaticamente. No requiere `@Query`.

### Patrones disponibles

```java
// findBy → SELECT WHERE
Optional<InsurancePolicy> findByPolicyNumber(String policyNumber);

// existsBy → SELECT COUNT > 0
boolean existsByInvoiceId(UUID invoiceId);
boolean existsByAppointmentIdAndMedicationId(UUID appointmentId, UUID medicationId);

// countBy → SELECT COUNT
long countByStatus(InvoiceStatus status);

// deleteBy → DELETE WHERE (requiere @Transactional)
void deleteByInvoiceId(UUID invoiceId);
```

### Navegacion de relaciones

Spring Data resuelve las relaciones automaticamente usando el nombre del campo seguido de la propiedad. No necesitas escribir un JOIN:

```java
// Appointment tiene @ManyToOne patient
// Spring genera: WHERE a.patient.id = :patientId
Page<Appointment> findByPatientId(UUID patientId, Pageable pageable);

// MedicalRecord tiene @ManyToOne appointment
// Spring genera: WHERE m.appointment.id = :appointmentId
Optional<MedicalRecord> findByAppointmentId(UUID appointmentId);

// Prescription tiene @ManyToOne medicalRecord y @ManyToOne medication
// Spring genera: WHERE p.medicalRecord.id = :mrId AND p.medication.id = :medId
boolean existsByMedicalRecordIdAndMedicationId(UUID medicalRecordId, UUID medicationId);
```

### Ordenamiento en el nombre

```java
// Agrega ORDER BY payment_date DESC directamente desde el nombre
Page<Payment> findByInvoiceIdOrderByPaymentDateDesc(UUID invoiceId, Pageable pageable);
```

---

## @Query con JPQL

Cuando la logica no se puede expresar con un nombre de metodo, se usa `@Query` con JPQL (Java Persistence Query Language). JPQL usa nombres de entidades y campos Java, no nombres de tablas ni columnas SQL.

### Filtros opcionales con IS NULL OR

Patron para hacer todos los filtros opcionales. Pasar `null` para ignorar un filtro:

```java
@Query("""
        SELECT i FROM Invoice i
        WHERE (:patientId IS NULL OR i.patient.id = :patientId)
          AND (:status    IS NULL OR i.status = :status)
          AND (:startDate IS NULL OR i.issueDate >= :startDate)
          AND (:endDate   IS NULL OR i.issueDate <= :endDate)
        ORDER BY i.issueDate DESC
        """)
Page<Invoice> findWithFilters(
        @Param("patientId") UUID patientId,
        @Param("status") InvoiceStatus status,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate,
        Pageable pageable);
```

El mismo patron se usa en `AppointmentRepository.findWithFilters` y `InvoiceRepository.findWithFilters`.

### Consultas de agregacion

`COALESCE` evita que SUM retorne `null` cuando no hay filas:

```java
// Retorna BigDecimal, nunca null
@Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.invoice.id = :invoiceId")
BigDecimal sumAmountByInvoiceId(@Param("invoiceId") UUID invoiceId);
```

### Verificacion de existencia con JOIN

Cuando la condicion requiere navegar relaciones complejas:

```java
@Query("""
        SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END
        FROM InsurancePolicy p
        WHERE p.provider.id = :providerId AND p.isActive = true
        """)
boolean existsActiveByProviderId(@Param("providerId") UUID providerId);
```

### ORDER BY forzado en queries con texto libre

Cuando necesitas ordenamiento que no se puede expresar con el nombre del metodo:

```java
@Query("""
        SELECT p FROM Prescription p
        WHERE p.medicalRecord.id = :medicalRecordId
        ORDER BY p.createdAt DESC
        """)
Page<Prescription> findByMedicalRecordId(UUID medicalRecordId, Pageable pageable);
```

---

## Paginacion

### Pageable y Page

`Pageable` es el parametro de entrada que lleva pagina, tamanio y orden. `Page<T>` es el resultado con los datos y metadatos (total de elementos, total de paginas).

```java
// En el repositorio: Pageable siempre es el ultimo parametro
Page<Appointment> findByPatientId(UUID patientId, Pageable pageable);

// En el servicio: el caller decide la pagina y tamanio
// El controlador recibe estos parametros del cliente vía @PageableDefault o query params
Page<Appointment> page = appointmentRepository.findByPatientId(id, pageable);

// Transformar a DTO sin perder metadatos de paginacion
Page<AppointmentResponse> response = page.map(appointmentMapper::toResponse);
```

`Page<T>` incluye: `getContent()`, `getTotalElements()`, `getTotalPages()`, `getNumber()`, `getSize()`.

---

## Bloqueo Pesimista — SELECT FOR UPDATE

Necesario cuando dos transacciones concurrentes deben leer y modificar la misma fila sin que se pisen.

```java
// @Lock requiere @Query explicita, no funciona con queries derivadas
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT s FROM InvoiceSequence s WHERE s.year = :year")
Optional<InvoiceSequence> findByYearForUpdate(@Param("year") Integer year);
```

**Como funciona:**

```
Transaccion A:                           Transaccion B (concurrente):
  findByYearForUpdate(2026)                findByYearForUpdate(2026)
  → BD bloquea la fila                     → BLOQUEADA (espera)
  lee lastSequence = 5
  incrementa a 6
  COMMIT
                                           → se desbloquea, lee 6
                                           incrementa a 7
                                           COMMIT
```

Sin el lock, ambas transacciones leerían `5` y generarían el mismo número de factura.

### saveAndFlush para el primer registro del año

Cuando la fila no existe aun (primer uso del año), no hay nada que bloquear. Se inserta con `saveAndFlush` para forzar el INSERT inmediatamente dentro de la transaccion actual:

```java
InvoiceSequence seq = invoiceSequenceRepository.findByYearForUpdate(year)
        .orElseGet(() -> {
            InvoiceSequence newSeq = new InvoiceSequence();
            newSeq.setYear(year);
            newSeq.setLastSequence(0);
            return invoiceSequenceRepository.saveAndFlush(newSeq); // INSERT inmediato
        });

seq.setLastSequence(seq.getLastSequence() + 1);
// Hibernate detecta el cambio en el objeto gestionado y emite UPDATE al hacer flush
```

`save()` normal no fuerza el flush — espera al cierre de la transaccion. `saveAndFlush()` lo fuerza de inmediato, haciendo visible la fila a otras transacciones.

---

## Cuando Usar Query Derivada vs @Query

| Situacion | Usar |
|---|---|
| Filtro simple por un campo o relacion | Query derivada (`findByX`, `existsByX`) |
| Ordenamiento simple | Query derivada con `OrderBy` en el nombre |
| Filtros opcionales (algunos pueden ser null) | `@Query` con patron `IS NULL OR` |
| Agregaciones (`SUM`, `COUNT`, `MAX`) | `@Query` |
| Condiciones sobre relaciones de segundo nivel | `@Query` con JOIN |
| Bloqueo pesimista | `@Query` + `@Lock` |
| Consulta muy larga que hace el nombre ilegible | `@Query` |

---

## Patrones del Proyecto

### No iterar colecciones de entidades para busquedas

En lugar de cargar `patient.getAppointments()` y filtrar en memoria, consultar directamente:

```java
// Incorrecto: carga todas las citas del paciente en memoria
patient.getAppointments().stream()
        .filter(a -> a.getStatus() == Status.COMPLETED)
        .collect(toList());

// Correcto: query eficiente con filtros en BD
appointmentRepository.findWithFilters(null, patientId, Status.COMPLETED, null, null, pageable);
```

### existsById antes de operar sin cargar la entidad

Cuando solo necesitas saber si algo existe pero no vas a usar la entidad:

```java
// No carga el paciente, solo verifica existencia
if (!patientRepository.existsById(request.patientId())) {
    throw new EntityNotFoundException(...);
}
```

### getReferenceById para asignar FKs sin cargar la entidad

Cuando solo necesitas la referencia para asignar una FK, no los datos del objeto:

```java
// No hace SELECT al paciente, solo crea un proxy con el ID
appointment.setPatient(patientRepository.getReferenceById(request.patientId()));
```

---

## Resumen de Buenas Practicas

| Practica | Razon |
|---|---|
| Extender `JpaRepository<E, ID>` | Provee todos los metodos CRUD sin codigo adicional. |
| `@Param` siempre en `@Query` con parametros nombrados | Evita ambiguedad, especialmente con multiples parametros del mismo tipo. |
| Patron `IS NULL OR` para filtros opcionales | Un solo metodo cubre todas las combinaciones de filtros. |
| `COALESCE(SUM(...), 0)` en agregaciones | SUM retorna null si no hay filas; COALESCE lo convierte en cero. |
| `@Lock` solo con `@Query` explicita | `@Lock` no funciona con queries derivadas. |
| `saveAndFlush` cuando el INSERT debe ser visible de inmediato | `save` difiere el INSERT al flush; `saveAndFlush` lo fuerza. |
| Repositorios sin logica de negocio | Solo acceso a datos. Toda validacion y regla de negocio va en el servicio. |
