# Anotaciones de Spring Boot

Referencia rapida organizada por capa. Una linea por anotacion.

---

## Spring Core — Contenedor e Inyeccion de Dependencias

| Anotacion | Uso |
|---|---|
| `@Component` | Marca una clase como bean generico gestionado por Spring. |
| `@Service` | Igual que `@Component` pero semanticamente indica logica de negocio. |
| `@Repository` | Igual que `@Component` pero semanticamente indica acceso a datos. Ademas traduce excepciones de persistencia a `DataAccessException`. |
| `@Controller` | Marca una clase como controlador MVC. Retorna vistas. |
| `@RestController` | Combina `@Controller` + `@ResponseBody`. Todos los metodos retornan JSON directamente. |
| `@Configuration` | Marca una clase como fuente de definiciones de beans (`@Bean`). |
| `@Bean` | Declara un metodo como productor de un bean. Solo dentro de clases `@Configuration`. |
| `@Autowired` | Inyecta una dependencia por tipo. Preferir inyeccion por constructor (no requiere esta anotacion). |
| `@Qualifier("nombre")` | Cuando hay varios beans del mismo tipo, especifica cual inyectar. |
| `@Primary` | Marca un bean como el preferido cuando hay varios candidatos del mismo tipo. |
| `@Scope("prototype")` | Define el alcance del bean. Por defecto es `singleton`. Opciones: `prototype`, `request`, `session`. |
| `@Value("${propiedad}")` | Inyecta un valor de `application.yml` en un campo. |
| `@ConfigurationProperties(prefix = "app.jwt")` | Mapea un bloque de `application.yml` a una clase tipada. |
| `@Profile("dev")` | El bean solo se crea si el perfil activo coincide. |
| `@Conditional` | El bean solo se crea si se cumple una condicion programatica. |

---

## Spring Web MVC — Controladores

| Anotacion | Uso |
|---|---|
| `@RequestMapping("/ruta")` | Mapea una ruta HTTP a nivel de clase o metodo. |
| `@GetMapping("/ruta")` | Atajo para `@RequestMapping(method = GET)`. |
| `@PostMapping("/ruta")` | Atajo para `@RequestMapping(method = POST)`. |
| `@PutMapping("/ruta")` | Atajo para `@RequestMapping(method = PUT)`. |
| `@PatchMapping("/ruta")` | Atajo para `@RequestMapping(method = PATCH)`. |
| `@DeleteMapping("/ruta")` | Atajo para `@RequestMapping(method = DELETE)`. |
| `@PathVariable` | Extrae un segmento de la URL: `/pacientes/{id}` → `@PathVariable UUID id`. |
| `@RequestParam` | Extrae un parametro de query string: `/pacientes?page=0` → `@RequestParam int page`. |
| `@RequestBody` | Deserializa el cuerpo JSON de la peticion a un objeto Java. |
| `@ResponseBody` | El valor de retorno del metodo se serializa como cuerpo de la respuesta. Ya incluido en `@RestController`. |
| `@ResponseStatus(HttpStatus.CREATED)` | Fija el codigo de estado HTTP devuelto por el metodo. |
| `@RequestHeader("Authorization")` | Extrae un header especifico de la peticion. |
| `@CrossOrigin` | Configura CORS para un controlador o metodo. |

---

## Manejo de Errores

| Anotacion | Uso |
|---|---|
| `@ControllerAdvice` | Marca una clase como manejador global de excepciones para todos los controladores. |
| `@RestControllerAdvice` | Igual que `@ControllerAdvice` + `@ResponseBody`. Retorna JSON en lugar de vistas. |
| `@ExceptionHandler(MiExcepcion.class)` | Metodo que captura un tipo especifico de excepcion lanzada desde cualquier controlador. |

---

## Validacion — Jakarta Validation (Bean Validation)

Requieren `@Valid` o `@Validated` en el controlador para activarse.

| Anotacion | Uso |
|---|---|
| `@Valid` | Activa la validacion en cascada sobre el objeto anotado (parametro de controlador o campo anidado). |
| `@Validated` | Similar a `@Valid`, ademas soporta grupos de validacion. Se puede anotar a nivel de clase. |
| `@NotNull` | El campo no puede ser `null`. |
| `@NotBlank` | El campo no puede ser `null`, vacio ni contener solo espacios. Solo para `String`. |
| `@NotEmpty` | El campo no puede ser `null` ni vacio. Aplica a `String`, colecciones y arrays. |
| `@Size(min, max)` | Longitud de `String`, coleccion o array dentro del rango. |
| `@Min(valor)` | Numero mayor o igual al valor. |
| `@Max(valor)` | Numero menor o igual al valor. |
| `@Positive` | Numero estrictamente mayor a cero. |
| `@PositiveOrZero` | Numero mayor o igual a cero. |
| `@Email` | El `String` debe tener formato de email valido. |
| `@Pattern(regexp = "...")` | El `String` debe coincidir con la expresion regular. |
| `@Past` | La fecha debe ser en el pasado. |
| `@PastOrPresent` | La fecha debe ser en el pasado o hoy. |
| `@Future` | La fecha debe ser en el futuro. |
| `@DecimalMin` / `@DecimalMax` | Rango para `BigDecimal`. |
| `@Digits(integer, fraction)` | Controla el numero de digitos enteros y decimales. |

---

## Spring Data JPA — Entidades

| Anotacion | Uso |
|---|---|
| `@Entity` | Marca la clase como entidad JPA (tabla en la BD). |
| `@Table(name = "nombre")` | Especifica el nombre de la tabla. Si se omite, usa el nombre de la clase. |
| `@Id` | Marca el campo como clave primaria. |
| `@GeneratedValue(strategy = ...)` | Define la estrategia de generacion de la PK. `AUTO`, `IDENTITY`, `SEQUENCE`, `UUID`. |
| `@UuidGenerator` | Genera UUIDs automaticamente (Hibernate 6+). |
| `@Column(name = "nombre", nullable = false)` | Personaliza la columna: nombre, nullable, unique, length, precision, scale. |
| `@Enumerated(EnumType.STRING)` | Persiste un enum como su nombre (`STRING`) o como su ordinal (`ORDINAL`). Preferir `STRING`. |
| `@Lob` | Mapea el campo a un tipo `TEXT` o `BLOB` en la BD. |
| `@Transient` | El campo no se persiste en la BD. |
| `@ManyToOne` | Relacion muchos-a-uno. El lado que tiene la FK. |
| `@OneToMany(mappedBy = "campo")` | Relacion uno-a-muchos. El lado sin FK; `mappedBy` referencia el campo de la otra entidad. |
| `@OneToOne` | Relacion uno-a-uno. |
| `@ManyToMany` | Relacion muchos-a-muchos. Requiere tabla de union. |
| `@JoinColumn(name = "fk_col")` | Especifica la columna FK en una relacion `@ManyToOne` o `@OneToOne`. |
| `@JoinTable` | Configura la tabla de union en relaciones `@ManyToMany`. |
| `@Embedded` | El campo es un objeto cuyas columnas se mapean en la misma tabla. |
| `@Embeddable` | Marca la clase como embebible dentro de una entidad. |
| `@CreationTimestamp` | Hibernate asigna automaticamente la fecha y hora de insercion. |
| `@UpdateTimestamp` | Hibernate asigna automaticamente la fecha y hora de la ultima modificacion. |
| `@Version` | Habilita bloqueo optimista. Hibernate incrementa este campo en cada `UPDATE`. |

---

## Spring Data JPA — Repositorios

| Anotacion | Uso |
|---|---|
| `@Repository` | Marca la interfaz como repositorio (generalmente no es necesario si extiende `JpaRepository`). |
| `@Query("SELECT ...")` | Define una consulta JPQL o SQL nativo sobre un metodo del repositorio. |
| `@Query(value = "...", nativeQuery = true)` | Consulta SQL nativa en lugar de JPQL. |
| `@Modifying` | Necesario junto con `@Query` cuando la consulta es `UPDATE` o `DELETE`. |
| `@Param("nombre")` | Nombra un parametro para usarlo en una consulta `@Query` con `:nombre`. |
| `@Lock(LockModeType.PESSIMISTIC_WRITE)` | Aplica un bloqueo de BD (`SELECT ... FOR UPDATE`) al metodo del repositorio. |

---

## Transacciones

| Anotacion | Uso |
|---|---|
| `@Transactional` | El metodo o todos los metodos de la clase corren dentro de una transaccion. Si lanza una excepcion no comprobada, hace rollback automaticamente. |
| `@Transactional(readOnly = true)` | Optimizacion para metodos de solo lectura. Hibernate deshabilita el dirty checking. |
| `@Transactional(rollbackFor = Exception.class)` | Hace rollback tambien con excepciones comprobadas (`checked`). |

---

## Spring Security

| Anotacion | Uso |
|---|---|
| `@EnableWebSecurity` | Activa la configuracion de seguridad web. Se coloca en la clase `@Configuration` que extiende la cadena de filtros. |
| `@EnableMethodSecurity` | Habilita anotaciones de seguridad a nivel de metodo como `@PreAuthorize`. |
| `@PreAuthorize("hasRole('ADMIN')")` | Valida una expresion SpEL antes de ejecutar el metodo. |
| `@PostAuthorize` | Valida una expresion SpEL despues de ejecutar el metodo (puede acceder al resultado). |
| `@Secured({"ROLE_ADMIN"})` | Lista de roles que pueden ejecutar el metodo. Menos expresivo que `@PreAuthorize`. |

---

## Spring Boot — Configuracion de la Aplicacion

| Anotacion | Uso |
|---|---|
| `@SpringBootApplication` | Meta-anotacion que combina `@Configuration` + `@EnableAutoConfiguration` + `@ComponentScan`. Punto de entrada de la aplicacion. |
| `@EnableAutoConfiguration` | Le dice a Spring Boot que configure automaticamente los beans segun las dependencias del classpath. |
| `@ComponentScan(basePackages = "...")` | Especifica el paquete base para la busqueda de componentes. Por defecto escanea el paquete de la clase anotada. |
| `@PropertySource("classpath:archivo.properties")` | Carga un archivo de propiedades adicional. |
| `@ConditionalOnProperty(name = "feature.enabled", havingValue = "true")` | El bean solo se crea si la propiedad tiene el valor indicado. |
| `@ConditionalOnMissingBean` | El bean solo se crea si no existe otro bean del mismo tipo. Util en auto-configuracion. |

---

## Lombok

| Anotacion | Uso |
|---|---|
| `@Getter` | Genera getters para todos los campos (a nivel de clase) o para un campo especifico. |
| `@Setter` | Genera setters. |
| `@ToString` | Genera `toString()`. |
| `@EqualsAndHashCode` | Genera `equals()` y `hashCode()`. |
| `@NoArgsConstructor` | Genera constructor sin argumentos. |
| `@AllArgsConstructor` | Genera constructor con todos los campos como parametros. |
| `@RequiredArgsConstructor` | Genera constructor solo con los campos `final` y `@NonNull`. El mas usado en servicios para inyeccion por constructor. |
| `@Data` | Combina `@Getter` + `@Setter` + `@ToString` + `@EqualsAndHashCode` + `@RequiredArgsConstructor`. Evitar en entidades JPA. |
| `@Builder` | Genera el patron Builder para la clase. |
| `@Value` | Hace la clase inmutable: todos los campos son `final`, solo genera getters y no setters. |
| `@Slf4j` | Inyecta un campo `log` del tipo `org.slf4j.Logger`. Equivale a declarar el logger manualmente. |

---

## OpenAPI / SpringDoc

| Anotacion | Uso |
|---|---|
| `@Tag(name = "Pacientes")` | Agrupa los endpoints de un controlador bajo una etiqueta en Swagger UI. |
| `@Operation(summary = "...")` | Documenta un endpoint con descripcion corta. |
| `@ApiResponse(responseCode = "200", description = "...")` | Documenta una posible respuesta HTTP del endpoint. |
| `@Parameter(description = "...")` | Documenta un parametro de la operacion. |
| `@Schema(description = "...")` | Documenta un campo de un DTO o modelo en el esquema OpenAPI. |
| `@Hidden` | Oculta el controlador o metodo de la documentacion generada. |
