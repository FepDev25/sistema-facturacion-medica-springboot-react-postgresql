# Configuracion del Proyecto

## Descripcion General

La configuracion del backend esta dividida en perfiles de Spring Boot. Cada perfil corresponde a un entorno de ejecucion especifico. La configuracion base reside en `application.yml` y cada perfil sobreescribe unicamente los valores que difieren.

---

## Estructura de Archivos

```
src/main/resources/
  application.yml           # Configuracion base compartida por todos los perfiles
  application-dev.yml       # Perfil de desarrollo local (Docker Compose)
  application-docker.yml    # Perfil para ejecucion del backend dentro de Docker
  application-test.yml      # Perfil para pruebas automatizadas con Testcontainers
```

---

## Perfiles Disponibles

### Base (`application.yml`)

Contiene los valores predeterminados que aplican a todos los entornos. No define conexion a base de datos ni a Redis, ya que esos valores son obligatoriamente especificos de cada entorno.

Bloques configurados:

- **JPA / Hibernate**: dialecto PostgreSQL, zona horaria UTC, `open-in-view` desactivado, `show-sql` desactivado por defecto.
- **Flyway**: habilitado, ubicacion de migraciones en `classpath:db/migration`.
- **JWT**: propiedades custom bajo el prefijo `app.jwt` (clave secreta, expiracion de access token y refresh token).
- **SpringDoc**: rutas de la documentacion OpenAPI (`/api-docs`) y Swagger UI (`/swagger-ui.html`).
- **Actuator**: expone unicamente los endpoints `health` e `info`.

### Desarrollo (`application-dev`)

Activo cuando se ejecuta con `-Dspring-boot.run.profiles=dev`.

Conecta a los contenedores del `docker-compose.yml` ubicado en la raiz del proyecto:

| Parametro | Valor |
|---|---|
| Host base de datos | `localhost:5434` |
| Base de datos | `fac_med_db` |
| Usuario | `medisys` |
| Password | `medisys_dev` |
| Host Redis | `localhost:6379` |
| Pool HikariCP | max 20 conexiones, min 5 inactivas |

Adicionalmente:
- Activa `show-sql: true` y `format_sql: true` para visualizar consultas en consola.
- Extiende las ubicaciones de Flyway con `classpath:db/seeds` para cargar datos de prueba.
- Establece nivel de log `DEBUG` para el paquete `com.fepdev.sfm`.

### Docker (`application-docker`)

Activo cuando el backend corre dentro del Docker Compose con `SPRING_PROFILES_ACTIVE=docker`.

Utiliza los nombres de servicio internos de Docker como hostnames:

| Parametro | Valor |
|---|---|
| Host base de datos | `postgres:5432` |
| Host Redis | `redis:6379` |

No carga seeds. Logs en nivel `INFO`.

### Test (`application-test`)

Activo durante la ejecucion de pruebas automatizadas.

- No carga seeds (`classpath:db/migration` unicamente) para mantener un estado de base de datos predecible.
- La URL de base de datos **no se configura aqui**; la provee Testcontainers mediante la anotacion `@ServiceConnection` en cada clase de test.
- Redis apunta al puerto `6370` para no interferir con la instancia de desarrollo.
- Logs reducidos al nivel `WARN`.

---

## Propiedades JWT

Las propiedades JWT son custom del proyecto y se leen mediante una clase `@ConfigurationProperties` que se implementara en la Fase 2 (Seguridad).

| Propiedad | Valor por defecto | Descripcion |
|---|---|---|
| `app.jwt.secret` | Clave generica en Base64 | Minimo 256 bits. Debe reemplazarse por variable de entorno en produccion. |
| `app.jwt.access-token-expiration` | `900000` | Expiracion del access token en milisegundos (15 minutos). |
| `app.jwt.refresh-token-expiration` | `604800000` | Expiracion del refresh token en milisegundos (7 dias). |

> **Importante:** La clave secreta definida en `application.yml` es unicamente para uso en desarrollo. En cualquier entorno real debe proveerse como variable de entorno o mediante un gestor de secretos. Nunca debe commitearse una clave de produccion al repositorio.

---

## Levantar el Entorno de Desarrollo

### Requisitos

- Docker y Docker Compose instalados.
- Java 21.
- Maven Wrapper incluido en el proyecto (`./mvnw`).

### Pasos

**1. Iniciar la base de datos y Redis:**

```bash
# Desde la raiz del repositorio
docker compose up -d
```

Esto levanta dos contenedores:
- `sfm-postgres`: PostgreSQL 15 en el puerto `5434` del host.
- `sfm-redis`: Redis 7 en el puerto `6379` del host.

**2. Ejecutar el backend:**

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Al iniciar, Flyway ejecutara automaticamente las migraciones pendientes en orden (V1 a V5).

**3. Verificar que funciona:**

```
GET http://localhost:8080/actuator/health
```

Debe devolver `{"status":"UP"}`.

**4. Acceder a Swagger UI:**

```
http://localhost:8080/swagger-ui.html
```

### Detener el Entorno

```bash
docker compose down
```

Para eliminar tambien los volumenes de datos (reset completo de la BD):

```bash
docker compose down -v
```

---

## Advertencias del IDE

El plugin de Spring Boot para VS Code puede reportar las siguientes advertencias en los archivos YAML. Todas son falsos positivos:

| Advertencia | Causa | Accion requerida |
|---|---|---|
| `Unknown property 'spring.flyway'` | El plugin no tiene el metadata de Spring Boot 4.0.3 aun. | Ninguna. Funciona correctamente en runtime. |
| `Unknown property 'app'` | Es una propiedad custom; el plugin no la conoce hasta implementar `@ConfigurationProperties`. | Ninguna. Se resolvera al crear la clase de configuracion JWT. |
| `Key contains special characters, use '[]'` | Claves con puntos en bloques de logging y hibernate. | Ninguna. YAML valido; es solo una recomendacion estetica del plugin. |
