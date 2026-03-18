# Ejemplos de Sintaxis

Referencia de patrones recurrentes en el proyecto. Cada seccion muestra la forma minima y correcta de implementar cada pieza.

---

## Entidad JPA

```java
@Entity
@Table(name = "patients")
@Getter
@Setter
@NoArgsConstructor
public class Patient {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Gender gender;

    @Column(name = "birth_date", nullable = false)
    private LocalDate birthDate;

    // Relacion muchos-a-uno: el lado que tiene la FK
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id")
    private Doctor doctor;

    // Relacion uno-a-muchos: el lado sin FK
    @OneToMany(mappedBy = "patient", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Appointment> appointments = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
```

**Notas:**
- `fetch = FetchType.LAZY` es obligatorio en `@ManyToOne` para evitar N+1 queries.
- Evitar `@Data` en entidades; genera `hashCode` basado en todos los campos, lo que rompe Hibernate con proxies lazy.
- Los enums se persisten como `STRING` para que la BD sea legible y los cambios de orden no corrompan datos.

---

## DTO de Peticion con Validaciones

```java
public record CreatePatientRequest(

    @NotBlank(message = "El DNI es obligatorio")
    @Size(max = 20, message = "El DNI no puede superar 20 caracteres")
    String dni,

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 100)
    String firstName,

    @NotBlank(message = "El apellido es obligatorio")
    @Size(max = 100)
    String lastName,

    @NotNull(message = "La fecha de nacimiento es obligatoria")
    @Past(message = "La fecha de nacimiento debe ser en el pasado")
    LocalDate birthDate,

    @NotBlank
    @Email(message = "El email no tiene formato valido")
    String email,

    @NotNull(message = "El genero es obligatorio")
    Gender gender

) {}
```

**Notas:**
- Los `record` son ideales para DTOs de entrada: inmutables y sin boilerplate.
- `@NotBlank` incluye la verificacion de `@NotNull`; no es necesario combinarlos para `String`.
- El mensaje en `message` es lo que llegara al cliente en la respuesta de error.

---

## DTO de Respuesta

```java
public record PatientResponse(
    UUID id,
    String dni,
    String firstName,
    String lastName,
    LocalDate birthDate,
    String email,
    Gender gender,
    OffsetDateTime createdAt
) {
    // Factory method para construir desde la entidad
    public static PatientResponse from(Patient patient) {
        return new PatientResponse(
            patient.getId(),
            patient.getDni(),
            patient.getFirstName(),
            patient.getLastName(),
            patient.getBirthDate(),
            patient.getEmail(),
            patient.getGender(),
            patient.getCreatedAt()
        );
    }
}
```

**Notas:**
- El metodo estatico `from` centraliza el mapeo entidad → DTO en el propio DTO.
- Nunca devolver la entidad directamente desde el controlador: expone la estructura interna y puede causar problemas de serializacion con relaciones lazy.

---

## Repositorio

```java
public interface PatientRepository extends JpaRepository<Patient, UUID> {

    // Derivado del nombre del metodo (Spring Data genera el SQL)
    boolean existsByDni(String dni);

    Optional<Patient> findByDni(String dni);

    // JPQL con parametro nombrado
    @Query("SELECT p FROM Patient p WHERE LOWER(p.lastName) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Patient> searchByLastName(@Param("name") String name);

    // SQL nativo
    @Query(value = "SELECT * FROM patients WHERE allergies @@ to_tsquery('spanish', :query)",
           nativeQuery = true)
    List<Patient> searchByAllergy(@Param("query") String query);

    // SELECT FOR UPDATE — bloqueo pesimista
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM InvoiceSequence s WHERE s.year = :year")
    Optional<InvoiceSequence> findByYearForUpdate(@Param("year") int year);
}
```

---

## Servicio

```java
@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;

    @Transactional(readOnly = true)
    public PatientResponse findById(UUID id) {
        Patient patient = patientRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Paciente no encontrado: " + id));
        return PatientResponse.from(patient);
    }

    @Transactional
    public PatientResponse create(CreatePatientRequest request) {
        if (patientRepository.existsByDni(request.dni())) {
            throw new ConflictException("Ya existe un paciente con DNI: " + request.dni());
        }

        Patient patient = new Patient();
        patient.setDni(request.dni());
        patient.setFirstName(request.firstName());
        patient.setLastName(request.lastName());
        patient.setBirthDate(request.birthDate());
        patient.setEmail(request.email());
        patient.setGender(request.gender());

        return PatientResponse.from(patientRepository.save(patient));
    }
}
```

**Notas:**
- `@RequiredArgsConstructor` genera el constructor con todos los campos `final`. Spring lo usa para inyeccion por constructor.
- `readOnly = true` en consultas: Hibernate omite el dirty checking, reduciendo overhead.
- Las excepciones de dominio (`ResourceNotFoundException`, `ConflictException`) son clases del proyecto; se resuelven en el `@RestControllerAdvice`.

---

## Controlador

```java
@RestController
@RequestMapping("/api/v1/patients")
@RequiredArgsConstructor
@Tag(name = "Pacientes", description = "Gestion de pacientes")
public class PatientController {

    private final PatientService patientService;

    @GetMapping("/{id}")
    @Operation(summary = "Obtener paciente por ID")
    public ResponseEntity<PatientResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(patientService.findById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Registrar nuevo paciente")
    public PatientResponse create(@Valid @RequestBody CreatePatientRequest request) {
        return patientService.create(request);
    }

    @GetMapping
    public ResponseEntity<Page<PatientResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(patientService.findAll(PageRequest.of(page, size)));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        patientService.delete(id);
    }
}
```

**Notas:**
- `@Valid` es indispensable para que las anotaciones del DTO de peticion se evaluen.
- `ResponseEntity.ok()` devuelve 200. Para 201 se puede usar `@ResponseStatus` o `ResponseEntity.created(uri).body(dto)`.
- El versionado en la ruta (`/api/v1`) facilita futuros cambios sin romper clientes existentes.

---

## Manejo Global de Errores

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // Error de validacion de @Valid
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        List<String> errors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .toList();
        return new ErrorResponse("VALIDATION_ERROR", "La peticion contiene campos invalidos", errors);
    }

    // Recurso no encontrado
    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(ResourceNotFoundException ex) {
        return new ErrorResponse("NOT_FOUND", ex.getMessage(), List.of());
    }

    // Conflicto de negocio (duplicado, estado invalido, etc.)
    @ExceptionHandler(ConflictException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponse handleConflict(ConflictException ex) {
        return new ErrorResponse("CONFLICT", ex.getMessage(), List.of());
    }

    // Error de conversion de tipo en path variable o query param
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String detail = "El parametro '" + ex.getName() + "' tiene un valor invalido: " + ex.getValue();
        return new ErrorResponse("INVALID_PARAMETER", detail, List.of());
    }

    // Fallback para errores no contemplados
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleGeneral(Exception ex) {
        log.error("Error no controlado", ex);
        return new ErrorResponse("INTERNAL_ERROR", "Error interno del servidor", List.of());
    }
}
```

```java
// DTO de respuesta de error estandar
public record ErrorResponse(
    String code,
    String message,
    List<String> details
) {}
```

```java
// Excepciones de dominio propias
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) { super(message); }
}

public class ConflictException extends RuntimeException {
    public ConflictException(String message) { super(message); }
}
```

---

## Validacion con @Validated en Metodo de Servicio

Para validar parametros sueltos (no un DTO) en un servicio o controlador:

```java
@Service
@Validated  // necesario a nivel de clase
@RequiredArgsConstructor
public class AppointmentService {

    public AppointmentResponse findById(@NotNull UUID id) {
        // Si id llega null, Spring lanza ConstraintViolationException automaticamente
    }
}
```

---

## Validacion Personalizada

Cuando ninguna anotacion estandar cubre la regla de negocio:

```java
// 1. Definir la anotacion
@Target({ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ValidDniValidator.class)
public @interface ValidDni {
    String message() default "El DNI tiene formato invalido";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

// 2. Implementar el validador
public class ValidDniValidator implements ConstraintValidator<ValidDni, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) return true; // delegar a @NotNull
        return value.matches("\\d{8}");
    }
}

// 3. Usar en el DTO
public record CreatePatientRequest(
    @ValidDni
    String dni
) {}
```

---

## Excepcion de Negocio con Codigo de Error

Para errores con informacion estructurada adicional:

```java
public class BusinessException extends RuntimeException {

    private final String errorCode;

    public BusinessException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() { return errorCode; }
}

// Uso en el servicio
throw new BusinessException("PATIENT_HAS_ACTIVE_INVOICES",
    "No se puede eliminar el paciente porque tiene facturas activas");

// Captura en el handler
@ExceptionHandler(BusinessException.class)
@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
public ErrorResponse handleBusiness(BusinessException ex) {
    return new ErrorResponse(ex.getErrorCode(), ex.getMessage(), List.of());
}
```

---

## Paginacion

```java
// Repositorio
Page<Patient> findByGender(Gender gender, Pageable pageable);

// Servicio
@Transactional(readOnly = true)
public Page<PatientResponse> findAll(Pageable pageable) {
    return patientRepository.findAll(pageable).map(PatientResponse::from);
}

// Controlador
@GetMapping
public Page<PatientResponse> list(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "createdAt") String sortBy,
        @RequestParam(defaultValue = "desc") String direction) {

    Sort sort = direction.equalsIgnoreCase("asc")
        ? Sort.by(sortBy).ascending()
        : Sort.by(sortBy).descending();

    return patientService.findAll(PageRequest.of(page, size, sort));
}
```

La respuesta de `Page<T>` ya incluye `content`, `totalElements`, `totalPages`, `number` y `size`.

---

## Transaccion con Bloqueo Pesimista

Patron para operaciones que requieren exclusion mutua (como generacion de numeros de factura):

```java
@Transactional
public String generateInvoiceNumber(int year) {
    InvoiceSequence seq = invoiceSequenceRepository
        .findByYearForUpdate(year)  // SELECT ... FOR UPDATE
        .orElseGet(() -> {
            InvoiceSequence newSeq = new InvoiceSequence();
            newSeq.setYear(year);
            newSeq.setLastSequence(0);
            return invoiceSequenceRepository.save(newSeq);
        });

    seq.setLastSequence(seq.getLastSequence() + 1);
    invoiceSequenceRepository.save(seq);

    return String.format("FAC-%d-%05d", year, seq.getLastSequence());
}
```

**Por que funciona:** el `SELECT ... FOR UPDATE` bloquea la fila hasta que la transaccion confirme. Cualquier otra transaccion concurrente que intente leer la misma fila esperara, garantizando que los numeros sean unicos y consecutivos.

---

## Configuracion de Seguridad (SecurityFilterChain)

```java
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/swagger-ui/**", "/api-docs/**").permitAll()
                .anyRequest().authenticated())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

---

## Enum con Valor Serializado

Cuando el enum tiene un valor distinto al nombre para JSON o BD:

```java
public enum InvoiceStatus {

    DRAFT("draft"),
    PENDING("pending"),
    PAID("paid"),
    OVERDUE("overdue");

    private final String value;

    InvoiceStatus(String value) { this.value = value; }

    @JsonValue
    public String getValue() { return value; }

    @JsonCreator
    public static InvoiceStatus fromValue(String value) {
        for (InvoiceStatus status : values()) {
            if (status.value.equalsIgnoreCase(value)) return status;
        }
        throw new IllegalArgumentException("Estado invalido: " + value);
    }
}
```

`@JsonValue` controla como se serializa el enum a JSON. `@JsonCreator` controla como se deserializa.
