# Relaciones JPA

Referencia completa de todos los tipos de relacion entre entidades. Cada seccion explica el concepto, quien tiene la FK, como se configura y sus variantes unidireccional y bidireccional.

---

## Conceptos Previos

### El lado dueno (owning side)

En toda relacion JPA existe un **lado dueno** y un **lado inverso**. Esta distincion es fundamental:

- El **lado dueno** es el que controla la relacion. Hibernate lee su estado para saber que escribir en la base de datos.
- El **lado inverso** es de solo lectura para Hibernate. Se declara con `mappedBy` y sirve unicamente para navegacion en memoria.

**Regla:** si modificas el lado inverso sin actualizar el lado dueno, Hibernate ignorara el cambio y no escribira nada en la BD.

### FetchType

Controla cuando Hibernate carga los datos relacionados.

| Valor | Comportamiento | Default en |
|---|---|---|
| `LAZY` | Los datos se cargan solo cuando accedes a la coleccion o al objeto. | `@OneToMany`, `@ManyToMany` |
| `EAGER` | Los datos se cargan junto con la entidad padre, siempre. | `@ManyToOne`, `@OneToOne` |

**Regla:** usar siempre `LAZY` en todas las relaciones. `EAGER` puede disparar queries no esperadas y causar el problema N+1 a escala.

### CascadeType

Define que operaciones JPA se propagan desde la entidad padre a la entidad hija.

| Valor | Propaga |
|---|---|
| `PERSIST` | Al guardar el padre, guarda tambien las entidades hijas nuevas. |
| `MERGE` | Al hacer merge del padre, hace merge de las hijas. |
| `REMOVE` | Al eliminar el padre, elimina las hijas. Peligroso en `@ManyToOne`. |
| `REFRESH` | Al refrescar el padre, refresca las hijas. |
| `DETACH` | Al desadjuntar el padre, desadjunta las hijas. |
| `ALL` | Aplica todos los anteriores. Solo usar en relaciones de composicion (el hijo no tiene sentido sin el padre). |

### orphanRemoval

Elimina automaticamente una entidad hija cuando es removida de la coleccion del padre. Solo aplica en `@OneToMany` y `@OneToOne`. Complementa `CascadeType.REMOVE` pero actua ante desconexion, no solo ante eliminacion del padre.

```java
// Con orphanRemoval: si haces padre.getItems().remove(item), Hibernate ejecuta DELETE del item
@OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
private List<InvoiceItem> items = new ArrayList<>();
```

---

## @ManyToOne — Muchos a Uno

Es la relacion mas comun. La FK vive en la tabla de la entidad que declara `@ManyToOne`.

### Unidireccional

Navegas de `Appointment` hacia `Patient`. No puedes navegar en sentido contrario desde `Patient`.

```java
@Entity
@Table(name = "appointments")
public class Appointment {

    @Id
    @UuidGenerator
    private UUID id;

    // La FK appointment.patient_id vive aqui
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;
}
```

```java
@Entity
@Table(name = "patients")
public class Patient {

    @Id
    @UuidGenerator
    private UUID id;

    private String firstName;

    // No sabe nada de Appointment. Relacion unidireccional.
}
```

**SQL generado:**
```sql
ALTER TABLE appointments ADD COLUMN patient_id UUID REFERENCES patients(id);
```

---

## @OneToMany — Uno a Muchos

Un paciente tiene muchas citas. La FK sigue estando en la tabla `appointments`, no en `patients`.

### Unidireccional (poco recomendada)

```java
@Entity
public class Patient {

    @OneToMany(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id") // indica donde esta la FK
    private List<Appointment> appointments = new ArrayList<>();
}
```

Sin `mappedBy`, Hibernate asume que esta es la duena de la relacion y genera una tabla de union intermedia a menos que se especifique `@JoinColumn`. Es confuso y genera SQL extra. **Preferir la version bidireccional.**

### Bidireccional

La variante correcta en casi todos los casos. Combina `@ManyToOne` en el hijo con `@OneToMany` en el padre.

```java
@Entity
@Table(name = "patients")
public class Patient {

    @Id
    @UuidGenerator
    private UUID id;

    // mappedBy = nombre del campo en Appointment que tiene la @ManyToOne
    // Este es el lado INVERSO: Hibernate lo ignora para escribir en BD
    @OneToMany(mappedBy = "patient", fetch = FetchType.LAZY,
               cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Appointment> appointments = new ArrayList<>();

    // Metodo helper para mantener ambos lados sincronizados
    public void addAppointment(Appointment appointment) {
        appointments.add(appointment);
        appointment.setPatient(this); // actualiza el lado dueno
    }

    public void removeAppointment(Appointment appointment) {
        appointments.remove(appointment);
        appointment.setPatient(null);
    }
}
```

```java
@Entity
@Table(name = "appointments")
public class Appointment {

    @Id
    @UuidGenerator
    private UUID id;

    // Este es el lado DUENO: Hibernate lee esto para escribir la FK
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;
}
```

**Por que los metodos helper son importantes:**

```java
// Sin helper — el lado inverso no queda sincronizado en memoria
patient.getAppointments().add(appointment); // lista actualizada
// appointment.getPatient() sigue siendo null hasta que recargues de BD

// Con helper — ambos lados sincronizados en la misma transaccion
patient.addAppointment(appointment); // correcto
appointment.getPatient(); // retorna el patient correctamente
```

---

## @OneToOne — Uno a Uno

Un expediente clinico pertenece exactamente a una cita, y una cita tiene exactamente un expediente.

### Unidireccional

```java
@Entity
@Table(name = "medical_records")
public class MedicalRecord {

    @Id
    @UuidGenerator
    private UUID id;

    // La FK medical_records.appointment_id vive aqui
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", nullable = false, unique = true)
    private Appointment appointment;
}
```

`unique = true` en `@JoinColumn` garantiza la cardinalidad uno-a-uno en la BD.

### Bidireccional

```java
@Entity
@Table(name = "appointments")
public class Appointment {

    @Id
    @UuidGenerator
    private UUID id;

    // Lado INVERSO: mappedBy referencia el campo en MedicalRecord
    // La FK NO esta aqui; esta en medical_records.appointment_id
    @OneToOne(mappedBy = "appointment", fetch = FetchType.LAZY,
              cascade = CascadeType.ALL, orphanRemoval = true)
    private MedicalRecord medicalRecord;

    public void setMedicalRecord(MedicalRecord record) {
        if (record == null) {
            if (this.medicalRecord != null) {
                this.medicalRecord.setAppointment(null);
            }
        } else {
            record.setAppointment(this); // actualiza el lado dueno
        }
        this.medicalRecord = record;
    }
}
```

```java
@Entity
@Table(name = "medical_records")
public class MedicalRecord {

    @Id
    @UuidGenerator
    private UUID id;

    // Lado DUENO: aqui esta la FK
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", nullable = false, unique = true)
    private Appointment appointment;
}
```

### @OneToOne con PK compartida

Variante donde la entidad hija usa la misma PK que el padre (no tiene columna FK separada):

```java
@Entity
@Table(name = "medical_records")
public class MedicalRecord {

    // La PK es la misma que la del Appointment
    @Id
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId // le dice a Hibernate que use la FK como PK
    @JoinColumn(name = "appointment_id")
    private Appointment appointment;
}
```

Util cuando el hijo es una extension directa del padre y no tendria sentido sin el.

---

## @ManyToMany — Muchos a Muchos

Una factura puede tener muchos servicios, y un servicio puede aparecer en muchas facturas. Siempre genera una tabla de union intermedia.

### Unidireccional

```java
@Entity
@Table(name = "invoices")
public class Invoice {

    @Id
    @UuidGenerator
    private UUID id;

    // Genera tabla invoice_services(invoice_id, service_id)
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "invoice_services",
        joinColumns = @JoinColumn(name = "invoice_id"),
        inverseJoinColumns = @JoinColumn(name = "service_id")
    )
    private Set<Service> services = new HashSet<>();
}
```

```java
@Entity
@Table(name = "services_catalog")
public class Service {

    @Id
    @UuidGenerator
    private UUID id;

    // No sabe nada de Invoice
}
```

### Bidireccional

```java
@Entity
@Table(name = "invoices")
public class Invoice {

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "invoice_services",
        joinColumns = @JoinColumn(name = "invoice_id"),
        inverseJoinColumns = @JoinColumn(name = "service_id")
    )
    private Set<Service> services = new HashSet<>();

    public void addService(Service service) {
        services.add(service);
        service.getInvoices().add(this); // sincroniza el lado inverso
    }

    public void removeService(Service service) {
        services.remove(service);
        service.getInvoices().remove(this);
    }
}
```

```java
@Entity
@Table(name = "services_catalog")
public class Service {

    // Lado INVERSO
    @ManyToMany(mappedBy = "services", fetch = FetchType.LAZY)
    private Set<Invoice> invoices = new HashSet<>();
}
```

### @ManyToMany con atributos extra en la tabla de union

Cuando la tabla de union tiene columnas propias (cantidad, precio en el momento, etc.), no se puede usar `@ManyToMany`. Se modela con dos `@ManyToOne`:

```java
// La tabla invoice_items tiene columnas propias: quantity, unit_price, subtotal
@Entity
@Table(name = "invoice_items")
public class InvoiceItem {

    @Id
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    private Service service; // nullable: puede ser medicamento en su lugar

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medication_id")
    private Medication medication; // nullable: puede ser servicio en su lugar

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false)
    private BigDecimal unitPrice;

    @Column(nullable = false)
    private BigDecimal subtotal;
}
```

```java
@Entity
@Table(name = "invoices")
public class Invoice {

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InvoiceItem> items = new ArrayList<>();
}
```

**Esta es la forma correcta** cuando la relacion tiene datos propios. `@ManyToMany` puro solo funciona para tablas de union sin columnas adicionales.

---

## Tabla Comparativa

| Relacion | FK en | `mappedBy` en | Lado dueno |
|---|---|---|---|
| `@ManyToOne` | tabla del hijo | no aplica | hijo (siempre) |
| `@OneToMany` unidireccional | tabla del hijo | no aplica | padre (con `@JoinColumn`) |
| `@OneToMany` bidireccional | tabla del hijo | padre | hijo (`@ManyToOne`) |
| `@OneToOne` | tabla que tiene `@JoinColumn` | el otro lado | quien tiene `@JoinColumn` |
| `@ManyToMany` | tabla de union | lado inverso | quien tiene `@JoinTable` |

---

## Problemas Frecuentes

### Bucle infinito al serializar a JSON

Con relaciones bidireccionales, Jackson serializa `Appointment → Patient → appointments → Appointment → ...` indefinidamente.

**Solucion A — `@JsonIgnore` en el lado inverso:**

```java
@Entity
public class Patient {

    @JsonIgnore // corta el ciclo
    @OneToMany(mappedBy = "patient")
    private List<Appointment> appointments;
}
```

**Solucion B — `@JsonManagedReference` / `@JsonBackReference`:**

```java
@Entity
public class Patient {

    @JsonManagedReference // serializa la coleccion normalmente
    @OneToMany(mappedBy = "patient")
    private List<Appointment> appointments;
}

@Entity
public class Appointment {

    @JsonBackReference // omite este campo en la serializacion
    @ManyToOne
    private Patient patient;
}
```

**Solucion C (recomendada) — nunca serializar entidades directamente:**

Usar DTOs en el controlador y mapear manualmente. La entidad nunca llega al serializador JSON. Esto elimina el problema de raiz y desacopla el modelo de persistencia del modelo de API.

---

### LazyInitializationException

```
org.hibernate.LazyInitializationException: could not initialize proxy - no Session
```

Ocurre cuando accedes a una relacion `LAZY` fuera de una transaccion activa.

```java
// Error: la transaccion del repositorio ya cerro cuando llegas aqui
Patient patient = patientRepository.findById(id).get();
// fuera de @Transactional...
patient.getAppointments().size(); // LazyInitializationException
```

**Soluciones:**

```java
// Opcion 1: mantener todo dentro de @Transactional en el servicio
@Transactional(readOnly = true)
public PatientResponse findById(UUID id) {
    Patient patient = patientRepository.findById(id).orElseThrow(...);
    patient.getAppointments().size(); // funciona: sesion activa
    return PatientResponse.from(patient);
}

// Opcion 2: fetch join en el repositorio cuando necesitas la coleccion
@Query("SELECT p FROM Patient p LEFT JOIN FETCH p.appointments WHERE p.id = :id")
Optional<Patient> findByIdWithAppointments(@Param("id") UUID id);

// Opcion 3: asegurarse de que open-in-view este desactivado (ya esta en este proyecto)
// y manejar correctamente las transacciones en la capa de servicio
```

---

### El problema N+1

Con una lista de pacientes, si accedes a `appointments` de cada uno, Hibernate ejecuta 1 query para los pacientes y N queries para las citas de cada uno.

```java
// Genera 1 + N queries
List<Patient> patients = patientRepository.findAll();
patients.forEach(p -> p.getAppointments().size()); // N queries adicionales
```

**Solucion: fetch join cuando necesitas los datos relacionados:**

```java
@Query("SELECT DISTINCT p FROM Patient p LEFT JOIN FETCH p.appointments")
List<Patient> findAllWithAppointments();
```

O usando `@EntityGraph`:

```java
@EntityGraph(attributePaths = {"appointments"})
List<Patient> findAll();
```

---

### equals y hashCode en entidades con relaciones

Si usas `@EqualsAndHashCode` de Lombok en una entidad con relaciones `LAZY`, Lombok incluye todos los campos en el calculo. Acceder a un proxy lazy dentro de `hashCode` puede disparar queries inesperadas o lanzar excepciones.

```java
// Peligroso con Lombok en entidades JPA
@Data // incluye @EqualsAndHashCode con todos los campos
public class Patient { ... }
```

**Solucion: basar equals/hashCode solo en la PK:**

```java
@Entity
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Patient {

    @Id
    @UuidGenerator
    @EqualsAndHashCode.Include
    private UUID id;
}
```

O sobreescribir manualmente:

```java
@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof Patient other)) return false;
    return id != null && id.equals(other.getId());
}

@Override
public int hashCode() {
    return getClass().hashCode(); // constante, seguro con proxies lazy
}
```

---

### Sincronizar siempre ambos lados en relaciones bidireccionales

```java
// Incorrecto: solo actualiza el lado inverso (Hibernate lo ignora para la BD)
patient.getAppointments().add(appointment);

// Correcto: actualizar el lado dueno
appointment.setPatient(patient);             // opcion minima
patient.addAppointment(appointment);         // con helper que actualiza ambos
```

Si no actualizas el lado dueno, la FK no se escribe en la BD aunque la coleccion en memoria parezca correcta.

---

## Resumen de Buenas Practicas

| Practica | Razon |
|---|---|
| Siempre `fetch = FetchType.LAZY` | Evita queries innecesarios al cargar entidades. |
| Metodos helper en el lado inverso (`addX`, `removeX`) | Mantiene ambos lados de la relacion sincronizados en memoria. |
| `mappedBy` en el lado sin FK | Indica a Hibernate cual lado controla la relacion. |
| `cascade = CascadeType.ALL` + `orphanRemoval = true` solo en composicion | Solo cuando el hijo no tiene sentido fuera del padre (items de factura, no pacientes). |
| Nunca serializar entidades directamente a JSON | Evita bucles infinitos y desacopla el modelo de persistencia. |
| `equals`/`hashCode` basados solo en la PK | Evita problemas con proxies lazy y colecciones. |
| Fetch join o `@EntityGraph` cuando necesitas datos relacionados | Evita el problema N+1. |
| `@ManyToMany` con tabla de union con columnas propias → dos `@ManyToOne` | `@ManyToMany` no permite atributos en la tabla de union. |
