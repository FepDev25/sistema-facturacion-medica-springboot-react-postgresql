# Dependencias del Proyecto

## Dependencias de Producción

### spring-boot-starter-webmvc
Framework base para crear APIs REST. Incluye Spring MVC, Tomcat embebido y Jackson para serialización JSON.

### spring-boot-starter-data-jpa
Abstracción de acceso a datos con JPA/Hibernate. Simplifica operaciones CRUD y consultas a la base de datos.

### spring-boot-starter-validation
Validación de datos con Bean Validation (Jakarta Validation). Permite usar anotaciones como @NotNull, @Size, @Email en DTOs.

### spring-boot-starter-security
Framework de autenticación y autorización. Base para implementar seguridad en endpoints y control de acceso por roles.

### spring-boot-starter-data-redis
Cliente Redis para gestión de caché distribuida y almacenamiento de sesiones. Mejora rendimiento en operaciones de lectura frecuentes.

### spring-boot-starter-actuator
Endpoints de monitoreo y métricas del sistema. Expone información de salud, métricas de performance y estado de la aplicación.

### postgresql
Driver JDBC para conectar con bases de datos PostgreSQL. Permite la comunicación entre la aplicación y el motor de base de datos.

### flyway-core
Motor de migraciones de base de datos versionadas. Gestiona cambios en el esquema de forma controlada y reproducible.

### flyway-database-postgresql
Extensión de Flyway específica para PostgreSQL. Agrega soporte para características propias del motor.

### springdoc-openapi-starter-webmvc-ui
Generación automática de documentación OpenAPI 3.0 y UI de Swagger. Documenta la API REST de forma interactiva.

### jjwt-api
API de JSON Web Tokens. Define las interfaces para crear y validar tokens JWT.

### jjwt-impl
Implementación de JJWT. Contiene la lógica de creación, firma y validación de tokens.

### jjwt-jackson
Integración de JJWT con Jackson. Serializa y deserializa los claims del token usando Jackson.

### lombok
Biblioteca para reducir código boilerplate. Genera automáticamente getters, setters, constructores y builders mediante anotaciones.

## Dependencias de Testing

### spring-boot-starter-webmvc-test
Utilidades de testing para Spring MVC. Incluye JUnit 5, Mockito, MockMvc y herramientas para probar controladores.

### spring-security-test
Utilidades para testing de seguridad. Permite simular usuarios autenticados y probar restricciones de acceso.

### spring-boot-testcontainers
Integración de Spring Boot con Testcontainers. Facilita el uso de contenedores Docker en pruebas de integración.

### testcontainers
Framework para ejecutar contenedores Docker en pruebas. Permite levantar servicios reales (bases de datos, colas, etc.) durante los tests.

### testcontainers:postgresql
Módulo de Testcontainers específico para PostgreSQL. Levanta una instancia real de PostgreSQL para pruebas de integración.

### testcontainers:junit-jupiter
Integración de Testcontainers con JUnit 5. Gestiona el ciclo de vida de los contenedores durante la ejecución de tests.

## Versiones Personalizadas

- **jjwt.version**: 0.12.5
- **springdoc.version**: 2.3.0
- **testcontainers.version**: 1.19.3

Las demás dependencias usan las versiones gestionadas por spring-boot-starter-parent 4.0.3.
