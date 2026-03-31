# Controladores REST — Guia Completa

Referencia exhaustiva para implementar controladores REST en este proyecto. Cubre estructura, codigos HTTP, validacion, paginacion, manejo de errores y todas las decisiones de diseno que aplican en esta aplicacion.

---

## Estructura Base

Un controlador en este proyecto siempre sigue el mismo esqueleto:

```java
@RestController
@RequestMapping("/api/v1/patients")
public class PatientController {

    private final PatientService patientService;

    public PatientController(PatientService patientService) {
        this.patientService = patientService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<PatientResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(patientService.getPatientById(id));
    }
}
```

**Reglas base:**
- `@RestController` es obligatorio. Combina `@Controller` + `@ResponseBody` → todos los métodos devuelven JSON.
- `@RequestMapping` en la clase define el prefijo de todas las rutas del controlador.
- Inyección por constructor. Sin `@Autowired`. El campo es `final`.
- El controlador solo llama al servicio. Sin lógica de negocio, sin acceso a repositorios.
- Los controladores reciben y devuelven **DTOs**, nunca entidades JPA.

---

## Anotaciones de Metodo

Cada método maneja una operación HTTP específica:

```java
@GetMapping("/{id}")          // GET  /api/v1/patients/{id}
@PostMapping                  // POST /api/v1/patients
@PutMapping("/{id}")          // PUT  /api/v1/patients/{id}
@PatchMapping("/{id}/confirm") // PATCH /api/v1/patients/{id}/confirm
@DeleteMapping("/{id}")       // DELETE /api/v1/patients/{id}
```

No usar `@RequestMapping` en métodos individuales. Las variantes específicas (`@GetMapping`, etc.) son más legibles.

---

## Parametros de Entrada

### @PathVariable — Segmentos de la URL

```java
// URL: /api/v1/patients/550e8400-e29b-41d4-a716-446655440000
@GetMapping("/{id}")
public ResponseEntity<PatientResponse> getById(@PathVariable UUID id) { ... }

// URL: /api/v1/patients/ABC123/appointments
@GetMapping("/{patientId}/appointments")
public ResponseEntity<Page<AppointmentResponse>> getAppointments(
        @PathVariable UUID patientId,
        Pageable pageable) { ... }
```

Spring convierte automáticamente `UUID`, `Long`, `Integer`, y enums desde la URL.

### @RequestParam — Query String

```java
// URL: /api/v1/patients?lastName=García&active=true&page=0&size=20
@GetMapping
public ResponseEntity<Page<PatientResponse>> list(
        @RequestParam(required = false) String lastName,
        @RequestParam(required = false) Boolean active,
        Pageable pageable) { ... }
```

**Reglas:**
- `required = false` para filtros opcionales. Si no se envía, el valor es `null`.
- No usar `@RequestParam` para `page`, `size` y `sort` — estos los maneja `Pageable` automáticamente.
- Para enums como filtros: `@RequestParam(required = false) InvoiceStatus status`. Spring los convierte por nombre.

### @RequestBody — Cuerpo JSON

```java
// POST /api/v1/patients  con body: { "dni": "12345678", "firstName": "Juan", ... }
@PostMapping
public ResponseEntity<PatientResponse> create(
        @Valid @RequestBody PatientCreateRequest request) { ... }
```

`@Valid` activa Bean Validation sobre el DTO. Sin `@Valid`, las anotaciones `@NotNull`, `@Size`, etc. del DTO no se ejecutan.

### @PageableDefault — Valores por defecto de Paginacion

```java
@GetMapping
public ResponseEntity<Page<PatientResponse>> list(
        @RequestParam(required = false) String lastName,
        @PageableDefault(size = 20, sort = "lastName") Pageable pageable) { ... }
```

`@PageableDefault` define qué devolver cuando el cliente no envía `page`, `size` ni `sort`. Sin esta anotación, el default es `page=0, size=20` sin orden definido.

---

## ResponseEntity — Construccion de Respuestas

`ResponseEntity<T>` permite controlar el código HTTP, los headers y el cuerpo de forma explícita.

### Metodos de fabrica (los mas comunes)

```java
// 200 OK con cuerpo
ResponseEntity.ok(body)
ResponseEntity.ok().body(body)  // equivalente

// 201 Created con header Location y cuerpo
ResponseEntity.created(uri).body(body)

// 204 No Content (sin cuerpo)
ResponseEntity.noContent().build()

// 404 Not Found (sin cuerpo)
ResponseEntity.notFound().build()

// Codigo arbitrario
ResponseEntity.status(HttpStatus.ACCEPTED).body(body)
ResponseEntity.status(422).body(errorDto)
```

### Construir el header Location para 201

El header `Location` indica al cliente dónde encontrar el recurso recién creado. Es parte del estándar REST y debe incluirse siempre en respuestas `201 Created`.

```java
@PostMapping
public ResponseEntity<PatientResponse> create(
        @Valid @RequestBody PatientCreateRequest request,
        UriComponentsBuilder uriBuilder) {

    PatientResponse response = patientService.createPatient(request);

    URI location = uriBuilder
            .path("/api/v1/patients/{id}")
            .buildAndExpand(response.id())
            .toUri();

    return ResponseEntity.created(location).body(response);
}
```

`UriComponentsBuilder` se inyecta automáticamente en el método, no necesita configuración.

### Cuando NO usar ResponseEntity

Si el método siempre devuelve `200 OK` con un cuerpo y no necesitas headers especiales, puedes omitir `ResponseEntity` y devolver el DTO directamente. Spring lo envuelve en `200 OK` automáticamente:

```java
// Sin ResponseEntity — equivale a 200 OK con el cuerpo
@GetMapping("/{id}")
public PatientResponse getById(@PathVariable UUID id) {
    return patientService.getPatientById(id);
}
```

En este proyecto se prefiere `ResponseEntity<T>` en todos los casos para ser explícito sobre el código HTTP devuelto.

---

## Codigos HTTP — Guia de Uso

### Tabla de decisiones

| Situacion | Codigo | Metodo HTTP comun |
|---|---|---|
| Consulta exitosa (datos encontrados) | `200 OK` | GET |
| Recurso creado exitosamente | `201 Created` | POST |
| Operacion exitosa sin datos que devolver | `204 No Content` | DELETE, PATCH de estado |
| Datos inválidos en el request (validación DTO) | `400 Bad Request` | POST, PUT, PATCH |
| Sin token de autenticación | `401 Unauthorized` | Cualquiera |
| Token válido pero sin permiso para esa operación | `403 Forbidden` | Cualquiera |
| Entidad buscada no existe (`EntityNotFoundException`) | `404 Not Found` | GET, PUT, PATCH, DELETE |
| Recurso ya existe (constraint único violado) | `409 Conflict` | POST |
| Operación viola una regla de negocio | `422 Unprocessable Entity` | POST, PUT, PATCH |
| Error inesperado del servidor | `500 Internal Server Error` | Cualquiera |

### Ejemplos en codigo

```java
// GET — recurso encontrado → 200
@GetMapping("/{id}")
public ResponseEntity<PatientResponse> getById(@PathVariable UUID id) {
    return ResponseEntity.ok(patientService.getPatientById(id));
    // Si no existe, el servicio lanza EntityNotFoundException → GlobalExceptionHandler → 404
}

// POST — recurso creado → 201 con Location
@PostMapping
public ResponseEntity<PatientResponse> create(
        @Valid @RequestBody PatientCreateRequest request,
        UriComponentsBuilder uriBuilder) {
    PatientResponse response = patientService.createPatient(request);
    URI location = uriBuilder.path("/api/v1/patients/{id}")
            .buildAndExpand(response.id()).toUri();
    return ResponseEntity.created(location).body(response);
}

// DELETE — eliminado sin contenido → 204
@DeleteMapping("/{id}")
public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
    patientService.deactivatePatient(id);
    return ResponseEntity.noContent().build();
}

// PATCH de transicion de estado → 200 con el recurso actualizado
@PatchMapping("/{id}/confirm")
public ResponseEntity<AppointmentResponse> confirm(@PathVariable UUID id) {
    return ResponseEntity.ok(appointmentService.confirmAppointment(id));
}
```

### Por que 422 y no 400 para violaciones de negocio

- `400 Bad Request` significa que el request está mal formado (datos inválidos, tipos incorrectos, campos faltantes). Es un error del cliente a nivel de sintaxis.
- `422 Unprocessable Entity` significa que el request está bien formado y los datos son válidos, pero la operación no se puede completar por una regla de negocio (médico inactivo, factura ya pagada, saldo insuficiente).
- Esta distinción permite al frontend mostrar mensajes de error distintos para cada caso.

---

## Paginacion

### Como funciona

`Pageable` es un objeto que Spring construye automáticamente a partir de los query params `page`, `size` y `sort`. El controlador solo lo declara como parámetro y lo pasa al servicio.

```java
// El cliente puede enviar: ?page=0&size=10&sort=lastName,asc&sort=firstName,asc
@GetMapping
public ResponseEntity<Page<PatientResponse>> list(
        @RequestParam(required = false) String lastName,
        @PageableDefault(size = 20, sort = "lastName") Pageable pageable) {
    return ResponseEntity.ok(patientService.getPatients(lastName, pageable));
}
```

### Que devuelve Page<T>

`Page<T>` serializado como JSON incluye:

```json
{
  "content": [ ... ],         // lista de objetos
  "totalElements": 150,       // total de registros en la BD
  "totalPages": 8,            // total de páginas
  "number": 0,                // página actual (0-indexed)
  "size": 20,                 // tamaño de página solicitado
  "first": true,              // ¿es la primera página?
  "last": false,              // ¿es la última página?
  "empty": false              // ¿el contenido está vacío?
}
```

### Ordenamiento con sort

El cliente puede ordenar por múltiples campos:

```
GET /api/v1/patients?sort=lastName,asc&sort=firstName,asc
GET /api/v1/invoices?sort=issueDate,desc
```

Los nombres de campo en `sort` corresponden a los nombres de campo de la **entidad JPA**, no del DTO. Si el campo en la entidad es `issueDate`, el cliente debe enviar `sort=issueDate,desc`.

### Pageable en la capa de servicio y repositorio

```java
// Controlador: pasa Pageable al servicio sin modificarlo
Page<PatientResponse> page = patientService.getPatients(lastName, pageable);

// Servicio: pasa Pageable al repositorio y mapea el resultado
Page<Patient> page = patientRepository.findAll(spec, pageable);
return page.map(patientMapper::toResponse);  // map preserva los metadatos de paginacion

// Repositorio: recibe Pageable como ultimo parametro
Page<Patient> findByLastNameContainingIgnoreCase(String lastName, Pageable pageable);
```

---

## Validacion en el Controlador

### @Valid activa Bean Validation

```java
@PostMapping
public ResponseEntity<InvoiceItemResponse> addItem(
        @PathVariable UUID invoiceId,
        @Valid @RequestBody InvoiceItemRequest request) { ... }
```

Sin `@Valid`, las anotaciones del DTO (`@NotNull`, `@Size`, `@Min`, etc.) no se evalúan. El objeto llega al servicio con datos inválidos sin ninguna excepción.

### Que pasa cuando la validacion falla

Cuando `@Valid` detecta violaciones, Spring lanza `MethodArgumentNotValidException` **antes** de que el método del controlador se ejecute. El `GlobalExceptionHandler` captura esta excepción y devuelve `400 Bad Request` con la lista de errores:

```json
{
  "timestamp": "2026-03-18T10:30:00Z",
  "status": 400,
  "error": "Validation Failed",
  "message": "Errores de validacion en los campos del request",
  "path": "/api/v1/invoice-items",
  "fieldErrors": [
    { "field": "quantity", "message": "La cantidad mínima es 1" },
    { "field": "unitPrice", "message": "El precio no puede ser nulo" }
  ]
}
```

### @Validated para validar @PathVariable y @RequestParam

`@Valid` no funciona sobre `@PathVariable` ni `@RequestParam`. Para validar esos parámetros, anotar la **clase** con `@Validated`:

```java
@Validated  // <-- a nivel de clase
@RestController
@RequestMapping("/api/v1/patients")
public class PatientController {

    @GetMapping("/search")
    public ResponseEntity<Page<PatientResponse>> search(
            @RequestParam @Size(min = 2, message = "Mínimo 2 caracteres") String q,
            Pageable pageable) { ... }
}
```

Cuando `@Validated` está en la clase y falla una validación de `@RequestParam`, Spring lanza `ConstraintViolationException` (no `MethodArgumentNotValidException`). El `GlobalExceptionHandler` debe manejar ambas.

---

## GlobalExceptionHandler

El manejador global captura excepciones de cualquier controlador y las convierte en respuestas JSON estandarizadas. Sin este componente, los errores de Spring llegan al cliente como HTML o con estructura inconsistente.

### Estructura del DTO de error

```java
// shared/dto/ErrorResponse.java
public record ErrorResponse(
        OffsetDateTime timestamp,
        int status,
        String error,
        String message,
        String path,
        List<FieldError> fieldErrors  // solo en errores de validacion
) {
    public record FieldError(String field, String message) {}

    // Constructor sin fieldErrors para errores simples
    public static ErrorResponse of(HttpStatus status, String message, HttpServletRequest request) {
        return new ErrorResponse(
                OffsetDateTime.now(ZoneOffset.UTC),
                status.value(),
                status.getReasonPhrase(),
                message,
                request.getRequestURI(),
                null
        );
    }
}
```

### Implementacion completa

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 404 — entidad no encontrada en la BD
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(
            EntityNotFoundException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of(HttpStatus.NOT_FOUND, ex.getMessage(), request));
    }

    // 422 — operacion viola una regla de negocio
    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ErrorResponse> handleBusinessRule(
            BusinessRuleException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ErrorResponse.of(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage(), request));
    }

    // 400 — campos del DTO invalidos (@Valid fallo)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {

        List<ErrorResponse.FieldError> fieldErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(e -> new ErrorResponse.FieldError(e.getField(), e.getDefaultMessage()))
                .toList();

        ErrorResponse body = new ErrorResponse(
                OffsetDateTime.now(ZoneOffset.UTC),
                400,
                "Validation Failed",
                "Errores de validacion en los campos del request",
                request.getRequestURI(),
                fieldErrors
        );

        return ResponseEntity.badRequest().body(body);
    }

    // 400 — @RequestParam o @PathVariable invalidos (@Validated fallo)
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(
            ConstraintViolationException ex, HttpServletRequest request) {

        List<ErrorResponse.FieldError> fieldErrors = ex.getConstraintViolations()
                .stream()
                .map(v -> {
                    String field = v.getPropertyPath().toString();
                    // el path incluye el nombre del metodo: "search.q" → tomar solo "q"
                    String shortField = field.contains(".") ? field.substring(field.lastIndexOf('.') + 1) : field;
                    return new ErrorResponse.FieldError(shortField, v.getMessage());
                })
                .toList();

        ErrorResponse body = new ErrorResponse(
                OffsetDateTime.now(ZoneOffset.UTC),
                400,
                "Validation Failed",
                "Parametros invalidos en la peticion",
                request.getRequestURI(),
                fieldErrors
        );

        return ResponseEntity.badRequest().body(body);
    }

    // 409 — constraint unico de BD violado (DNI duplicado, numero de poliza duplicado, etc.)
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(
            DataIntegrityViolationException ex, HttpServletRequest request) {

        // Traducir el mensaje tecnico de PostgreSQL a uno legible
        String message = "Ya existe un registro con esos datos. Verifique campos únicos.";
        String cause = ex.getMostSpecificCause().getMessage();
        if (cause != null) {
            if (cause.contains("patients_dni_key"))           message = "Ya existe un paciente con ese DNI.";
            else if (cause.contains("doctors_license"))       message = "Ya existe un médico con ese número de licencia.";
            else if (cause.contains("invoice_number"))        message = "Ya existe una factura con ese número.";
            else if (cause.contains("exclusion constraint"))  message = "El médico ya tiene una cita en ese horario.";
        }

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(HttpStatus.CONFLICT, message, request));
    }

    // 400 — JSON malformado (llave sin cerrar, tipo incorrecto, etc.)
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadable(
            HttpMessageNotReadableException ex, HttpServletRequest request) {
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(HttpStatus.BAD_REQUEST,
                        "El cuerpo de la peticion no es JSON valido o tiene tipos incorrectos.", request));
    }

    // 405 — metodo HTTP no permitido (llamar DELETE donde solo existe GET)
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotAllowed(
            HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(ErrorResponse.of(HttpStatus.METHOD_NOT_ALLOWED,
                        "Metodo HTTP no permitido: " + ex.getMethod(), request));
    }

    // 500 — cualquier excepcion no manejada explicitamente
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(
            Exception ex, HttpServletRequest request) {
        // Loguear el stack trace completo para debugging (no enviarlo al cliente)
        // log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Error interno del servidor. Contacte al administrador.", request));
    }
}
```

### Por que el orden de @ExceptionHandler no importa

Spring evalúa cada `@ExceptionHandler` por el tipo exacto de la excepción. Si lanzas `EntityNotFoundException`, Spring busca el handler de `EntityNotFoundException` directamente. El handler generico `Exception.class` solo se activa cuando ningún otro handler coincide.

---

## Patrones por Tipo de Operacion

### GET — Consulta por ID

```java
@GetMapping("/{id}")
public ResponseEntity<PatientResponse> getById(@PathVariable UUID id) {
    return ResponseEntity.ok(patientService.getPatientById(id));
}
// Si el ID no existe: el servicio lanza EntityNotFoundException → 404
// Si el ID existe: 200 con el DTO
```

### GET — Listado con filtros y paginacion

```java
@GetMapping
public ResponseEntity<Page<AppointmentResponse>> list(
        @RequestParam(required = false) UUID doctorId,
        @RequestParam(required = false) UUID patientId,
        @RequestParam(required = false) LocalDate date,
        @RequestParam(required = false) AppointmentStatus status,
        @PageableDefault(size = 20, sort = "scheduledAt", direction = Sort.Direction.DESC) Pageable pageable) {

    return ResponseEntity.ok(
            appointmentService.getAppointments(doctorId, patientId, date, status, pageable));
}
```

### GET — Busqueda por campo unico (no ID)

```java
@GetMapping("/number/{invoiceNumber}")
public ResponseEntity<InvoiceResponse> getByNumber(@PathVariable String invoiceNumber) {
    return ResponseEntity.ok(invoiceService.getInvoiceByNumber(invoiceNumber));
}
```

### POST — Crear recurso

```java
@PostMapping
public ResponseEntity<DoctorResponse> create(
        @Valid @RequestBody DoctorCreateRequest request,
        UriComponentsBuilder uriBuilder) {

    DoctorResponse response = doctorService.createDoctor(request);
    URI location = uriBuilder.path("/api/v1/doctors/{id}")
            .buildAndExpand(response.id()).toUri();
    return ResponseEntity.created(location).body(response);
}
```

### POST — Agregar recurso anidado (subrecurso)

```java
// POST /api/v1/invoices/{id}/items
@PostMapping("/{id}/items")
public ResponseEntity<InvoiceItemResponse> addItem(
        @PathVariable UUID id,
        @Valid @RequestBody InvoiceItemRequest request,
        UriComponentsBuilder uriBuilder) {

    InvoiceItemResponse response = invoiceService.addItem(id, request);
    URI location = uriBuilder.path("/api/v1/invoices/{invoiceId}/items/{itemId}")
            .buildAndExpand(id, response.id()).toUri();
    return ResponseEntity.created(location).body(response);
}
```

### PUT — Actualizar recurso completo

```java
@PutMapping("/{id}")
public ResponseEntity<PatientResponse> update(
        @PathVariable UUID id,
        @Valid @RequestBody PatientUpdateRequest request) {
    return ResponseEntity.ok(patientService.updatePatient(id, request));
}
```

### PATCH — Transicion de estado

```java
// PATCH no recibe body — la operacion esta definida por el endpoint
@PatchMapping("/{id}/confirm")
public ResponseEntity<InvoiceResponse> confirm(@PathVariable UUID id) {
    return ResponseEntity.ok(invoiceService.confirmInvoice(id));
}

@PatchMapping("/{id}/complete")
public ResponseEntity<AppointmentResponse> complete(
        @PathVariable UUID id,
        @Valid @RequestBody AppointmentCompleteRequest request) {
    // complete si necesita datos adicionales (notas clínicas, etc.)
    return ResponseEntity.ok(appointmentService.completeAppointment(id, request));
}
```

### DELETE — Eliminar o desactivar

```java
// Desactivacion logica → 204 sin cuerpo
@DeleteMapping("/{id}")
public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
    doctorService.deactivateDoctor(id);
    return ResponseEntity.noContent().build();
}

// Eliminacion de subrecurso → 204 sin cuerpo
@DeleteMapping("/{invoiceId}/items/{itemId}")
public ResponseEntity<Void> removeItem(
        @PathVariable UUID invoiceId,
        @PathVariable UUID itemId) {
    invoiceService.removeItem(invoiceId, itemId);
    return ResponseEntity.noContent().build();
}
```

---

## Controlador Completo — Ejemplo Real

```java
@RestController
@RequestMapping("/api/v1/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @GetMapping
    public ResponseEntity<Page<InvoiceResponse>> list(
            @RequestParam(required = false) UUID patientId,
            @RequestParam(required = false) InvoiceStatus status,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate,
            @PageableDefault(size = 20, sort = "issueDate", direction = Sort.Direction.DESC) Pageable pageable) {

        return ResponseEntity.ok(
                invoiceService.getInvoicesWithFilters(patientId, status, startDate, endDate, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(invoiceService.getInvoiceById(id));
    }

    @GetMapping("/number/{invoiceNumber}")
    public ResponseEntity<InvoiceResponse> getByNumber(@PathVariable String invoiceNumber) {
        return ResponseEntity.ok(invoiceService.getInvoiceByNumber(invoiceNumber));
    }

    @PostMapping("/{id}/items")
    public ResponseEntity<InvoiceItemResponse> addItem(
            @PathVariable UUID id,
            @Valid @RequestBody InvoiceItemRequest request,
            UriComponentsBuilder uriBuilder) {

        InvoiceItemResponse response = invoiceService.addItem(id, request);
        URI location = uriBuilder.path("/api/v1/invoices/{invoiceId}/items/{itemId}")
                .buildAndExpand(id, response.id()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @DeleteMapping("/{invoiceId}/items/{itemId}")
    public ResponseEntity<Void> removeItem(
            @PathVariable UUID invoiceId,
            @PathVariable UUID itemId) {
        invoiceService.removeItem(invoiceId, itemId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/confirm")
    public ResponseEntity<InvoiceResponse> confirm(@PathVariable UUID id) {
        return ResponseEntity.ok(invoiceService.confirmInvoice(id));
    }

    @PatchMapping("/{id}/overdue")
    public ResponseEntity<InvoiceResponse> markOverdue(@PathVariable UUID id) {
        return ResponseEntity.ok(invoiceService.markOverdue(id));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<InvoiceResponse> cancel(@PathVariable UUID id) {
        return ResponseEntity.ok(invoiceService.cancelInvoice(id));
    }
}
```

---

## Anotaciones de Seguridad por Endpoint

Con Spring Security configurado, los roles se pueden restringir en el controlador con `@PreAuthorize`:

```java
// Solo ADMIN puede crear servicios del catalogo
@PreAuthorize("hasRole('ADMIN')")
@PostMapping
public ResponseEntity<ServicesCatalogResponse> create(
        @Valid @RequestBody ServicesCatalogCreateRequest request,
        UriComponentsBuilder uriBuilder) { ... }

// ADMIN y RECEPTIONIST pueden registrar pagos
@PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
@PostMapping
public ResponseEntity<PaymentResponse> registerPayment(
        @Valid @RequestBody PaymentCreateRequest request,
        UriComponentsBuilder uriBuilder) { ... }

// Solo el propio DOCTOR puede completar una cita
@PreAuthorize("hasRole('DOCTOR')")
@PatchMapping("/{id}/complete")
public ResponseEntity<AppointmentResponse> complete(
        @PathVariable UUID id,
        @Valid @RequestBody AppointmentCompleteRequest request) { ... }
```

Para que `@PreAuthorize` funcione, habilitar `@EnableMethodSecurity` en la clase de configuración de seguridad. Si se prefiere centralizar toda la lógica de autorización en `SecurityFilterChain`, no usar `@PreAuthorize` en los métodos.

---

## Documentacion OpenAPI con SpringDoc

```java
@Tag(name = "Facturas", description = "Operaciones del modulo de facturacion")
@RestController
@RequestMapping("/api/v1/invoices")
public class InvoiceController {

    @Operation(
        summary = "Listar facturas con filtros",
        description = "Devuelve una pagina de facturas. Todos los filtros son opcionales."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Lista de facturas"),
        @ApiResponse(responseCode = "401", description = "Sin autenticacion",
                     content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping
    public ResponseEntity<Page<InvoiceResponse>> list(...) { ... }

    @Operation(summary = "Confirmar factura (draft → pending)")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Factura confirmada"),
        @ApiResponse(responseCode = "404", description = "Factura no encontrada"),
        @ApiResponse(responseCode = "422", description = "La factura no esta en estado DRAFT")
    })
    @PatchMapping("/{id}/confirm")
    public ResponseEntity<InvoiceResponse> confirm(@PathVariable UUID id) { ... }
}
```

Las anotaciones de SpringDoc son opcionales en desarrollo. Agregar cuando se implemente FASE 15.

---

## Convenciones del Proyecto

| Regla | Razon |
|---|---|
| `@RestController` en todos los controladores | Garantiza que todos los métodos devuelvan JSON. |
| `@RequestMapping` solo a nivel de clase | Define el prefijo una sola vez. Los métodos usan variantes específicas. |
| `@Valid` siempre antes de `@RequestBody` | Sin `@Valid`, el DTO llega al servicio sin validar. |
| `@PageableDefault` en todos los endpoints de listado | Define un orden y tamaño sensato cuando el cliente no especifica. |
| `ResponseEntity<T>` en todos los métodos | Hace explícito el código HTTP devuelto; evita asumir que siempre es 200. |
| `201 Created` con header `Location` en todos los POST | Estándar REST. Permite al cliente saber dónde encontrar el recurso creado. |
| `204 No Content` en DELETE y operaciones sin respuesta útil | No retornar un body vacío `{}` ni el recurso borrado. |
| El controlador nunca lanza excepciones manualmente | Las excepciones las lanza el servicio. El controlador solo llama y devuelve. |
| Sin lógica de negocio en el controlador | El controlador es solo traducción HTTP ↔ servicio. |
| Nombres de endpoint en kebab-case | `/medical-records`, `/no-show`, no `/medicalRecords` ni `/noShow`. |
| IDs siempre en el path, nunca en el body | `DELETE /invoices/{id}` no `DELETE /invoices` con `{ "id": "..." }` en el body. |

---

## Tabla de Referencia Rapida

| Operacion | Metodo HTTP | Codigo exito | Body de respuesta |
|---|---|---|---|
| Obtener recurso por ID | `GET /{id}` | `200 OK` | DTO completo |
| Listar recursos con filtros | `GET /` | `200 OK` | `Page<DTO>` |
| Buscar por campo único | `GET /field/{value}` | `200 OK` | DTO completo |
| Crear recurso | `POST /` | `201 Created` + `Location` header | DTO del recurso creado |
| Actualizar recurso completo | `PUT /{id}` | `200 OK` | DTO actualizado |
| Transicion de estado | `PATCH /{id}/accion` | `200 OK` | DTO actualizado |
| Eliminar / desactivar | `DELETE /{id}` | `204 No Content` | vacío |
| Agregar subrecurso | `POST /{id}/items` | `201 Created` | DTO del subrecurso |
| Eliminar subrecurso | `DELETE /{id}/items/{itemId}` | `204 No Content` | vacío |

| Error | Codigo HTTP | Lanzado por |
|---|---|---|
| DTO inválido (`@Valid` falló) | `400 Bad Request` | Spring (MethodArgumentNotValidException) |
| Parámetro inválido (`@Validated` falló) | `400 Bad Request` | Spring (ConstraintViolationException) |
| JSON malformado | `400 Bad Request` | Spring (HttpMessageNotReadableException) |
| Sin token / token inválido | `401 Unauthorized` | Spring Security |
| Token válido pero sin permiso | `403 Forbidden` | Spring Security |
| Entidad no encontrada | `404 Not Found` | Servicio (EntityNotFoundException) |
| Constraint único violado | `409 Conflict` | GlobalExceptionHandler (DataIntegrityViolationException) |
| Regla de negocio violada | `422 Unprocessable Entity` | Servicio (BusinessRuleException) |
| Error del servidor | `500 Internal Server Error` | GlobalExceptionHandler (Exception genérica) |
