# Servicios — Capa de Logica de Negocio

Referencia de patrones de servicios usados en este proyecto. Cubre transacciones, validaciones, maquinas de estado, calculos monetarios y decisiones de diseno.

---

## Estructura Base

```java
@Service
public class PatientService {

    private final PatientRepository patientRepository;
    private final PatientMapper patientMapper;

    // Inyeccion por constructor (sin @Autowired, Spring la detecta automaticamente)
    public PatientService(PatientRepository patientRepository, PatientMapper patientMapper) {
        this.patientRepository = patientRepository;
        this.patientMapper = patientMapper;
    }
}
```

Reglas basicas:
- `@Service` marca el bean como logica de negocio.
- Inyeccion por constructor: los campos son `final`, garantiza inmutabilidad y facilita testing.
- Solo el servicio toca el repositorio. Los controladores solo hablan con el servicio.
- Los servicios retornan DTOs, nunca entidades.

---

## Transacciones

### @Transactional

Cada metodo publico que escribe en la BD debe ser `@Transactional`. Si lanza una excepcion no comprobada (`RuntimeException`), Spring hace rollback automaticamente.

```java
@Transactional
public PatientResponse createPatient(PatientCreateRequest request) {
    Patient patient = patientMapper.toEntity(request);
    return patientMapper.toResponse(patientRepository.save(patient));
}
```

### @Transactional(readOnly = true)

Para metodos que solo leen datos. Hibernate desactiva el dirty-checking (no rastrea cambios), lo que reduce el uso de memoria y puede mejorar el rendimiento.

```java
@Transactional(readOnly = true)
public PatientResponse getPatientById(UUID id) {
    Patient patient = patientRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Paciente con ID: " + id + " no encontrado"));
    return patientMapper.toResponse(patient);
}
```

### Propagacion por defecto: REQUIRED

Cuando un metodo `@Transactional` llama a otro `@Transactional`, el segundo **participa en la transaccion existente** (no crea una nueva). Esto es fundamental en flujos como `completeAppointment`:

```java
// AppointmentService.completeAppointment (@Transactional)
//   → medicalRecordRepository.save(...)        ← misma transaccion
//   → invoiceService.createDraftInvoice(...)   ← @Transactional, participa en la misma
//       → invoiceSequenceRepository.saveAndFlush(...)  ← tambien en la misma
//       → invoiceRepository.save(...)          ← tambien en la misma
//
// Si cualquier paso falla, TODA la operacion hace rollback.
```

---

## Patron de Metodo Estandar

La mayoria de metodos de escritura sigue este orden:

```java
@Transactional
public InvoiceResponse addItem(UUID invoiceId, InvoiceItemRequest request) {
    // 1. Cargar entidades necesarias (lanza excepcion si no existen)
    Invoice invoice = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new EntityNotFoundException("..."));

    // 2. Validar reglas de negocio
    if (invoice.getStatus() != InvoiceStatus.DRAFT) {
        throw new BusinessRuleException("...");
    }

    // 3. Construir la entidad (via mapper + setters para campos que el mapper ignora)
    InvoiceItem item = invoiceItemMapper.toEntity(request);
    item.setInvoice(invoice);
    item.setSubtotal(toMoney(request.unitPrice().multiply(BigDecimal.valueOf(request.quantity()))));

    // 4. Persistir
    InvoiceItem saved = invoiceItemRepository.save(item);

    // 5. Efectos secundarios (recalculos, actualizaciones de estado relacionado)
    recalculateTotals(invoiceId);

    // 6. Retornar DTO
    return invoiceItemMapper.toResponse(saved);
}
```

---

## Manejo de Excepciones

Se usan dos tipos de excepcion segun el motivo del error:

| Excepcion | Cuando usarla | HTTP esperado |
|---|---|---|
| `EntityNotFoundException` (Jakarta) | La entidad buscada no existe en la BD. | 404 Not Found |
| `BusinessRuleException` (custom) | La entidad existe pero la operacion viola una regla de negocio. | 409 Conflict / 422 |

```java
// No existe → EntityNotFoundException
Doctor doctor = doctorRepository.findById(request.doctorId())
        .orElseThrow(() -> new EntityNotFoundException("El doctor con id: " + id + " no existe"));

// Existe pero viola regla de negocio → BusinessRuleException
if (!doctor.isActive()) {
    throw new BusinessRuleException("El doctor con id: " + id + " no esta activo");
}
```

Nunca mezclar los dos: un doctor inactivo no es "not found", es una violacion de regla.

---

## Maquinas de Estado

Los cambios de estado siguen la maquina de estados definida en el roadmap. Cada transicion se valida explicitamente:

```java
// DRAFT → PENDING (confirmInvoice)
if (invoice.getStatus() != InvoiceStatus.DRAFT) {
    throw new BusinessRuleException(
            "Solo se pueden confirmar facturas en DRAFT. Estado actual: " + invoice.getStatus());
}

// PENDING | PARTIAL_PAID → OVERDUE (markOverdue)
if (invoice.getStatus() != InvoiceStatus.PENDING && invoice.getStatus() != InvoiceStatus.PARTIAL_PAID) {
    throw new BusinessRuleException("...");
}

// Estados PAID y CANCELLED son finales: ningun metodo de estado los acepta como origen
```

**Principio:** cada metodo valida solo los estados de origen validos. No existe un metodo generico `setStatus` expuesto al exterior.

---

## Configuracion con @Value

Para valores configurables sin recompilar (como la tasa de impuesto):

```java
@Service
public class InvoiceService {

    @Value("${billing.tax.rate:0.15}") // 0.15 es el valor por defecto si no esta en properties
    private BigDecimal taxRate;
}
```

En `application.properties`:
```properties
billing.tax.rate=0.15
```

Esto permite cambiar la tasa por ambiente (prod/staging) sin tocar el codigo. Se prefiere sobre una constante hardcodeada para valores que pueden cambiar por politica o regulacion.

---

## Calculos Monetarios con BigDecimal

Nunca usar `double` o `float` para dinero. `BigDecimal` es el tipo correcto.

### Reglas aplicadas en este proyecto

```java
private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

// Siempre pasar el literal como String, no como double
// new BigDecimal(0.15) → 0.14999999... (error de precision flotante)
// new BigDecimal("0.15") → exactamente 0.15
private static final BigDecimal TAX_RATE = new BigDecimal("0.15");

// Normalizar a 2 decimales despues de cada operacion
private BigDecimal toMoney(BigDecimal amount) {
    if (amount == null) return ZERO;
    return amount.setScale(2, RoundingMode.HALF_UP);
}
```

### Formula de cobertura de seguro

```java
// cobertura bruta con precision extra durante el calculo
BigDecimal grossCoverage = total.multiply(
        coveragePercentage.divide(ONE_HUNDRED, 6, RoundingMode.HALF_UP));

// restar deducible, minimo cero
BigDecimal insuranceCoverage = toMoney(grossCoverage.subtract(deductible));
if (insuranceCoverage.compareTo(ZERO) < 0) insuranceCoverage = ZERO;
if (insuranceCoverage.compareTo(total) > 0) insuranceCoverage = total;
```

### Comparacion de BigDecimal

`equals` en BigDecimal considera la escala: `2.50.equals(2.5)` es `false`. Siempre usar `compareTo`:

```java
// Incorrecto: puede fallar por diferencia de escala
if (newTotalPaid.equals(invoice.getTotal())) { ... }

// Correcto
if (newTotalPaid.compareTo(invoice.getTotal()) == 0) { ... }
```

---

## Metodos Internos Package-Private

Cuando un metodo debe ser accesible desde el mismo paquete pero no desde controladores ni otros servicios, se declara sin modificador de acceso (package-private):

```java
// Accesible desde addItem y removeItem en el mismo paquete
// No accesible desde controladores ni otros servicios
@Transactional
void recalculateTotals(UUID invoiceId) {
    // ...
}
```

Esto se usa para `recalculateTotals` en `InvoiceService` porque es una operacion interna que siempre debe ser disparada por `addItem`/`removeItem`, nunca llamada directamente como endpoint.

---

## Construccion Manual vs Mapper

El mapper se usa cuando la mayoria de campos se mapean directamente del request a la entidad. Para la factura no hay un `InvoiceCreateRequest` util porque el servicio calcula o asigna casi todos los campos:

```java
// Invoice se construye manualmente: el servicio genera el numero,
// asigna estado, calcula fechas y pone montos en cero
Invoice invoice = new Invoice();
invoice.setInvoiceNumber(generateInvoiceNumber(year));
invoice.setStatus(InvoiceStatus.DRAFT);
invoice.setIssueDate(LocalDate.now());
invoice.setDueDate(LocalDate.now().plusDays(DUE_DATE_DAYS));
invoice.setSubtotal(ZERO);
// ...
```

Para entidades como `Payment` o `Prescription` donde el request tiene la mayoria de los datos:

```java
// El mapper copia los campos directamente; el servicio solo asigna las relaciones
Payment payment = paymentMapper.toEntity(request);
payment.setInvoice(invoice); // la relacion no viene en el request
```

---

## Respuestas con Datos de Relaciones (Items sin Bidireccional)

Cuando la entidad no tiene una coleccion bidirecional pero el DTO de respuesta si la necesita, el servicio la carga manualmente:

```java
// InvoiceMapper ignora items (@Mapping target="items" ignore=true)
// porque Invoice no tiene List<InvoiceItem> (no hay bidireccional)
private InvoiceResponse buildFullResponse(Invoice invoice) {
    InvoiceResponse base = invoiceMapper.toResponse(invoice);
    List<InvoiceItemResponse> items = invoiceItemMapper.toResponseList(
            invoiceItemRepository.findByInvoiceId(invoice.getId()));
    return new InvoiceResponse(
            base.id(), base.patientId(), ..., items, base.createdAt(), base.updatedAt());
}
```

Se usa en `getInvoiceById` y `getInvoiceByNumber`. No se usa en `getInvoicesWithFilters` (listado) porque ese retorna `InvoiceResponse` sin items para no generar N+1 queries.

---

## Navegacion Lazy Dentro de @Transactional

Con `@Transactional` activa, es seguro navegar relaciones `LAZY` sin queries adicionales al repositorio:

```java
@Transactional
public PrescriptionResponse createPrescription(PrescriptionCreateRequest request) {
    MedicalRecord medicalRecord = medicalRecordRepository.findById(request.medicalRecordId())
            .orElseThrow(...);

    // medicalRecord.appointment es LAZY, pero la sesion esta activa
    // Hibernate emite el SELECT solo cuando accedemos al campo
    if (!medicalRecord.getAppointment().getId().equals(request.appointmentId())) {
        throw new BusinessRuleException("...");
    }

    // Evita un segundo findById(appointmentId) innecesario
    Appointment appointment = medicalRecord.getAppointment();
}
```

**Regla:** si ya cargaste la entidad padre y necesitas datos del hijo, navega la relacion en lugar de hacer un segundo `findById`. Es una query extra evitada.

---

## Validaciones de Consistencia

Cuando dos IDs del request deben referirse a la misma entidad, validar la consistencia navegando la relacion cargada, no con queries adicionales:

```java
// Incorrecto: hace un SELECT innecesario solo para verificar que existe
if (!appointmentRepository.existsById(request.appointmentId())) {
    throw new EntityNotFoundException("...");
}
// Ademas no verifica que sea la MISMA cita del expediente

// Correcto: navega la relacion y valida consistencia en un solo paso
if (!medicalRecord.getAppointment().getId().equals(request.appointmentId())) {
    throw new BusinessRuleException("El appointment_id y medical_record_id no pertenecen a la misma consulta");
}
```

---

## Actualizacion Automatica de Estado Derivado

Cuando el estado de una entidad depende del estado de otra, el servicio lo actualiza en la misma transaccion:

```java
// Tras registrar un pago, recalcular el estado de la factura
BigDecimal newTotalPaid = totalPaid.add(request.amount());
if (newTotalPaid.compareTo(invoice.getTotal()) == 0) {
    invoice.setStatus(InvoiceStatus.PAID);
} else {
    // cubre PENDING → PARTIAL_PAID y OVERDUE → PARTIAL_PAID
    invoice.setStatus(InvoiceStatus.PARTIAL_PAID);
}
invoiceRepository.save(invoice);
```

**Principio:** el cliente nunca envía el nuevo estado de la factura. El servicio lo calcula a partir de los datos.

---

## Resumen de Buenas Practicas

| Practica | Razon |
|---|---|
| `@Transactional` en todo metodo de escritura | Garantiza atomicidad y rollback automatico ante errores. |
| `@Transactional(readOnly = true)` en lectura | Desactiva dirty-checking, mejora rendimiento. |
| Inyeccion por constructor con campos `final` | Inmutabilidad, testing facil, sin necesidad de `@Autowired`. |
| `EntityNotFoundException` vs `BusinessRuleException` | Distingue "no existe" de "viola una regla", permite HTTP correcto en cada caso. |
| Validar estado antes de toda transicion | La maquina de estados se mantiene coherente aunque se llamen endpoints en orden incorrecto. |
| `BigDecimal` con literales String y `compareTo` | Evita errores de precision flotante y problemas de escala en comparaciones. |
| `toMoney()` helper para normalizar a 2 decimales | Centraliza el redondeo, evita inconsistencias entre operaciones. |
| Navegar relacion cargada vs segundo findById | Evita queries innecesarias cuando la sesion ya tiene el objeto en el contexto. |
| Estado derivado calculado en el servicio, nunca enviado por el cliente | El cliente no puede poner una factura en PAID manualmente; el pago lo activa. |
| Metodos internos package-private | Impide que operaciones internas sean invocadas como endpoints accidentalmente. |
