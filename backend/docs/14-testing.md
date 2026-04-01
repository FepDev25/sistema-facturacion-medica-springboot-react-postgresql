# Testing - Estado actual y lecciones aprendidas

Documento de referencia del estado actual de pruebas del backend y de los incidentes tecnicos relevantes encontrados durante su implementacion.

---

## 1) Panorama actual de pruebas

Actualmente el backend cuenta con una suite de pruebas por capas, cubriendo reglas de negocio, mappers/converters, seguridad JWT, persistencia, controladores web y flujos integrados con base de datos real.

Resultado de referencia mas reciente:

- Comando: `./mvnw clean verify`
- Resultado: `BUILD SUCCESS`
- Totales: `Tests run: 316, Failures: 0, Errors: 0, Skipped: 0`
- JaCoCo: `All coverage checks have been met`
- Cobertura global (bundle): lineas `89.89%` y ramas `74.55%`

### Tabla resumen de cobertura por modulo

| Modulo | Paquete | Cobertura lineas | Cobertura ramas |
|---|---|---:|---:|
| Security | `com.fepdev.sfm.backend.security` | `100.00%` | `75.00%` |
| Appointment | `com.fepdev.sfm.backend.domain.appointment` | `96.68%` | `95.00%` |
| Invoice | `com.fepdev.sfm.backend.domain.invoice` | `95.81%` | `82.64%` |
| Payment | `com.fepdev.sfm.backend.domain.payment` | `100.00%` | `100.00%` |
| Insurance | `com.fepdev.sfm.backend.domain.insurance` | `82.81%` | `67.50%` |
| Patient | `com.fepdev.sfm.backend.domain.patient` | `81.53%` | `72.00%` |
| Doctor | `com.fepdev.sfm.backend.domain.doctor` | `83.06%` | `87.50%` |
| Catalog | `com.fepdev.sfm.backend.domain.catalog` | `89.38%` | `60.87%` |
| Medical Record | `com.fepdev.sfm.backend.domain.medicalrecord` | `89.12%` | `66.00%` |
| Shared Audit | `com.fepdev.sfm.backend.shared.audit` | `64.20%` | `25.00%` |
| Config | `com.fepdev.sfm.backend.config` | `100.00%` | `0.00%` |
| Auth | `com.fepdev.sfm.backend.domain.auth` | `97.14%` | `83.33%` |

Fuente: `target/site/jacoco/jacoco.csv` de la ultima ejecucion `./mvnw clean verify`.

---

## 2) Tipos de pruebas implementadas

## 2.1 Unit tests de dominio (servicios + mappers + converters)

Validan reglas de negocio y mapeos en aislamiento, sin levantar infraestructura externa.

Clases incluidas (principales):

- Appointment:
  - `src/test/java/com/fepdev/sfm/backend/domain/appointment/AppointmentServiceTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/appointment/AppointmentMapperImplTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/appointment/AppointmentStatusAndDtoTest.java`
- Invoice:
  - `src/test/java/com/fepdev/sfm/backend/domain/invoice/InvoiceServiceTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/invoice/InvoiceItemAndMapperImplTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/invoice/InvoiceEnumsConvertersAndDtoTest.java`
- Payment:
  - `src/test/java/com/fepdev/sfm/backend/domain/payment/PaymentServiceTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/payment/PaymentMapperImplTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/payment/PaymentMethodAndConverterTest.java`
- Insurance:
  - `src/test/java/com/fepdev/sfm/backend/domain/insurance/InsuranceServiceTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/insurance/InsuranceProviderMapperImplTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/insurance/InsurancePolicyMapperImplTest.java`
- Patient:
  - `src/test/java/com/fepdev/sfm/backend/domain/patient/PatientServiceTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/patient/PatientMapperImplTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/patient/GenderAndConverterTest.java`
- Doctor:
  - `src/test/java/com/fepdev/sfm/backend/domain/doctor/DoctorServiceTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/doctor/DoctorMapperImplTest.java`
- Catalog:
  - `src/test/java/com/fepdev/sfm/backend/domain/catalog/ServiceCatalogServiceTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/catalog/MedicationsCatalogServiceTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/catalog/ServicesCatalogMapperImplTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/catalog/MedicationsCatalogMapperImplTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/catalog/CatalogEnumsAndConvertersTest.java`
- Medical Record:
  - `src/test/java/com/fepdev/sfm/backend/domain/medicalrecord/MedicalRecordServiceTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/medicalrecord/ProcedureServiceTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/medicalrecord/DiagnosisServiceTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/medicalrecord/PrescriptionServiceTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/medicalrecord/MedicalRecordMapperImplTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/medicalrecord/ProcedureMapperImplTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/medicalrecord/DiagnosisMapperImplTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/medicalrecord/PrescriptionMapperImplTest.java`
  - `src/test/java/com/fepdev/sfm/backend/domain/medicalrecord/SeverityAndConverterTest.java`

Cobertura principal:

- validaciones de transiciones de estado,
- calculo de montos y pagos,
- reglas de negocio por modulo,
- manejo de errores de dominio.

## 2.2 DataJpa tests de persistencia

Validan consultas, constraints y comportamiento de repositorios contra PostgreSQL.

Base comun:

- `src/test/java/com/fepdev/sfm/backend/persistence/AbstractPostgresDataJpaTest.java`

Clases incluidas:

- `src/test/java/com/fepdev/sfm/backend/persistence/appointment/AppointmentRepositoryDataJpaTest.java`
- `src/test/java/com/fepdev/sfm/backend/persistence/constraints/DbConstraintsDataJpaTest.java`
- `src/test/java/com/fepdev/sfm/backend/persistence/converter/EnumConvertersDataJpaTest.java`
- `src/test/java/com/fepdev/sfm/backend/persistence/doctor/DoctorRepositoryDataJpaTest.java`
- `src/test/java/com/fepdev/sfm/backend/persistence/invoice/InvoiceRepositoryDataJpaTest.java`
- `src/test/java/com/fepdev/sfm/backend/persistence/invoice/InvoiceSequenceRepositoryDataJpaTest.java`
- `src/test/java/com/fepdev/sfm/backend/persistence/patient/PatientRepositoryDataJpaTest.java`
- `src/test/java/com/fepdev/sfm/backend/persistence/payment/PaymentRepositoryDataJpaTest.java`

Cobertura principal:

- filtros y paginacion,
- secuencias y agregaciones,
- conversiones de enums,
- constraints de base de datos (check, unique, etc.).

## 2.3 WebMvc tests de controladores

Validan endpoints HTTP en capa web (serializacion, codigos, contratos de respuesta), aislando la capa de transporte.

Clases incluidas:

- `src/test/java/com/fepdev/sfm/backend/web/appointment/AppointmentControllerWebMvcTest.java`
- `src/test/java/com/fepdev/sfm/backend/web/auth/AuthControllerWebMvcTest.java`
- `src/test/java/com/fepdev/sfm/backend/web/catalog/ServiceCatalogControllerWebMvcTest.java`
- `src/test/java/com/fepdev/sfm/backend/web/catalog/MedicationsCatalogControllerWebMvcTest.java`
- `src/test/java/com/fepdev/sfm/backend/web/doctor/DoctorControllerWebMvcTest.java`
- `src/test/java/com/fepdev/sfm/backend/web/insurance/InsurancePolicyControllerWebMvcTest.java`
- `src/test/java/com/fepdev/sfm/backend/web/insurance/InsuranceProviderControllerWebMvcTest.java`
- `src/test/java/com/fepdev/sfm/backend/web/invoice/InvoiceControllerWebMvcTest.java`
- `src/test/java/com/fepdev/sfm/backend/web/medicalrecord/MedicalRecordControllerWebMvcTest.java`
- `src/test/java/com/fepdev/sfm/backend/web/patient/PatientControllerWebMvcTest.java`
- `src/test/java/com/fepdev/sfm/backend/web/payment/PaymentControllerWebMvcTest.java`
- `src/test/java/com/fepdev/sfm/backend/web/security/SecurityConfigSourceRulesTest.java`

Cobertura adicional de seguridad en capa web:

- AuthController: casos de login/refresh/logout, incluyendo refresh valido/invalido y revocacion por blacklist en refresh.
- SecurityConfigSourceRulesTest: guardrails de reglas criticas por rol para `patients`, `payments`, `appointments/*/complete`, `doctors`, `insurance` y `catalog`.

## 2.6 Unit tests especificos de seguridad

Validan comportamiento de JWT, filtro de autenticacion, carga de usuarios y blacklist en Redis.

Clases incluidas:

- `src/test/java/com/fepdev/sfm/backend/security/JwtServiceTest.java`
- `src/test/java/com/fepdev/sfm/backend/security/JwtAuthenticationFilterTest.java`
- `src/test/java/com/fepdev/sfm/backend/security/UserDetailsServiceImplTest.java`
- `src/test/java/com/fepdev/sfm/backend/security/TokenBlacklistServiceTest.java`
- `src/test/java/com/fepdev/sfm/backend/security/SystemUserTest.java`

Cobertura actual del paquete `com.fepdev.sfm.backend.security`:

- Lineas: `100%`
- Ramas: `75%`

Cobertura por clase:

- `JwtService`: lineas `100%` (33/33), ramas `78.57%` (11/14)
- `JwtAuthenticationFilter`: lineas `100%` (21/21), ramas `60%` (6/10)
- `UserDetailsServiceImpl`: lineas `100%` (5/5)
- `TokenBlacklistService`: lineas `100%` (8/8), ramas `100%` (4/4)
- `SystemUser`: lineas `100%` (6/6)
- `Role`: lineas `100%` (4/4)

## 2.4 Integration tests E2E de flujos de negocio (servicio + DB real)

Validan flujos transversales completos a nivel de servicios, usando PostgreSQL real en Testcontainers (sin pasar por capa HTTP/JWT).

Base comun:

- `src/test/java/com/fepdev/sfm/backend/integration/e2e/AbstractPostgresFlowE2ETest.java`

Clases incluidas:

- `src/test/java/com/fepdev/sfm/backend/integration/e2e/AppointmentCompletionFlowE2ETest.java`
- `src/test/java/com/fepdev/sfm/backend/integration/e2e/InvoiceLifecyclePaymentFlowE2ETest.java`
- `src/test/java/com/fepdev/sfm/backend/integration/e2e/InsuranceCoverageFlowE2ETest.java`
- `src/test/java/com/fepdev/sfm/backend/integration/e2e/MedicationPrescriptionFlowE2ETest.java`
- `src/test/java/com/fepdev/sfm/backend/integration/e2e/CancellationRulesFlowE2ETest.java`

Cobertura de flujos implementados:

- cita completada -> historial medico creado -> factura draft creada,
- adicion de items a factura + confirmacion + pagos parciales/totales,
- impacto de seguro activo/expirado/inactivo en cobertura/responsabilidad,
- regla de `requires_prescription` para medicamentos,
- reglas de cancelacion (citas y facturas).

Perfil y configuracion asociados:

- `src/test/resources/application-integration-e2e.yml`

## 2.5 Smoke/context test de arranque

Verifica que el contexto Spring arranca correctamente con infraestructura de prueba.

- `src/test/java/com/fepdev/sfm/backend/BackendApplicationTests.java`

Estado actual:

- Test habilitado (ya no esta desactivado).
- Ejecuta con Testcontainers + perfil `integration-e2e`.

---

## 3) Problema critico con Docker/Testcontainers

Esta seccion es critica para futuras ejecuciones en otros entornos.

### 3.1 Sintoma observado

Al ejecutar pruebas con Testcontainers, aparecia un error de compatibilidad de API de Docker:

`client version 1.32 is too old. Minimum supported API version is 1.40`

### 3.2 Diagnostico

Se verifico que Docker local estaba operativo:

- `docker version` reportaba API moderna (`1.54`).
- `docker run hello-world` funcionaba.

Concluson: el problema no era Docker daemon caido, sino la configuracion utilizada por `docker-java`/Testcontainers al resolver el endpoint/API version.

### 3.3 Causa raiz

Desalineacion entre la configuracion efectiva usada por `docker-java` y la version real del daemon local.

### 3.4 Solucion aplicada

Se creo el archivo de configuracion de usuario:

- `~/.docker-java.properties`

Contenido aplicado:

```properties
api.version=1.54
docker.host=unix:///var/run/docker.sock
```

Adicionalmente, la base de pruebas E2E define valores por defecto de seguridad para el entorno local:

- `src/test/java/com/fepdev/sfm/backend/integration/e2e/AbstractPostgresFlowE2ETest.java`
  - `docker.host=unix:///var/run/docker.sock`
  - `docker.api.version=1.54`

### 3.5 Verificacion posterior

Tras la correccion:

- Testcontainers detecto el socket local correctamente.
- Ryuk y contenedores PostgreSQL iniciaron sin error.
- Las suites E2E y el `clean test` completo finalizaron en verde.

---

## 4) Incidentes tecnicos adicionales resueltos

### 4.1 Compatibilidad Jackson en Spring Boot 4

Sintoma:

- Fallas de contexto por import de `ObjectMapper` no compatible.

Correccion aplicada:

- Uso de `tools.jackson.databind.ObjectMapper` en `src/main/java/com/fepdev/sfm/backend/shared/audit/AuditAspect.java`.

### 4.2 Aislamiento de contexto entre clases E2E

Sintoma:

- Conexiones a puertos viejos de contenedores al reutilizar contexto Spring entre clases (connection refused).

Correccion aplicada:

- `@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)` en `src/test/java/com/fepdev/sfm/backend/integration/e2e/AbstractPostgresFlowE2ETest.java`.

Resultado:

- Evita reutilizacion de datasource contra puertos ya descartados entre clases E2E.

---

## 5) Comandos recomendados de ejecucion

Ejecucion total (recomendada para estado real + umbrales):

```bash
./mvnw clean verify
```

Solo flujos E2E:

```bash
./mvnw -Dtest="*FlowE2ETest" test
```

Solo smoke test de contexto:

```bash
./mvnw -Dtest="BackendApplicationTests" clean test
```

Ejecucion de cobertura con umbrales (JaCoCo):

```bash
./mvnw clean verify
```

Nota: `./mvnw clean test` ejecuta pruebas y genera reporte JaCoCo, pero la validacion de umbrales (`jacoco:check`) ocurre en `verify`.

---

## 6) Checklist rapido para entorno nuevo

- Docker daemon activo y funcional.
- Socket local disponible: `/var/run/docker.sock`.
- Archivo `~/.docker-java.properties` presente con `api.version` y `docker.host` correctos.
- Ejecutar `./mvnw clean verify` y validar `BUILD SUCCESS`.

Si vuelve a aparecer error de API version antigua, revisar primero `~/.docker-java.properties`.
