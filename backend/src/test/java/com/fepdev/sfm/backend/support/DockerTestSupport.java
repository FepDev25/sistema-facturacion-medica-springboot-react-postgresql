package com.fepdev.sfm.backend.support;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

/**
 * Configura docker-java/Testcontainers antes de arrancar el primer contenedor.
 *
 * docker-java usa por defecto la API 1.32. Los Docker Engine modernos rechazan
 * esa version con "client version 1.32 is too old", y Testcontainers 1.20.x no
 * la negocia sola. La propiedad que lee el cliente es {@code api.version}; el
 * proyecto usaba {@code docker.api.version}, que era ignorada.
 *
 * Orden de precedencia:
 * 1. -Dapi.version=...
 * 2. -Ddocker.api.version=... (compatibilidad con la configuracion anterior)
 * 3. DOCKER_API_VERSION
 * 4. La version maxima que reporta el servidor con `docker version`
 * 5. 1.44 como fallback (Docker 25+)
 */
public final class DockerTestSupport {

    private static final String API_VERSION_PROPERTY = "api.version";
    private static final String LEGACY_API_VERSION_PROPERTY = "docker.api.version";
    private static final String FALLBACK_API_VERSION = "1.44";

    static {
        configure();
    }

    private DockerTestSupport() {
    }

    public static void configure() {
        if (System.getProperty("docker.host") == null && System.getenv("DOCKER_HOST") == null) {
            System.setProperty("docker.host", "unix:///var/run/docker.sock");
        }

        String configured = firstNonBlank(
                System.getProperty(API_VERSION_PROPERTY),
                System.getProperty(LEGACY_API_VERSION_PROPERTY),
                System.getenv("DOCKER_API_VERSION"));

        String resolved = configured != null ? configured : detectServerApiVersion();
        if (resolved == null) {
            resolved = FALLBACK_API_VERSION;
        }

        System.setProperty(API_VERSION_PROPERTY, resolved);
        System.setProperty(LEGACY_API_VERSION_PROPERTY, resolved);
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private static String detectServerApiVersion() {
        Process process = null;
        try {
            process = new ProcessBuilder(
                            "docker", "version", "--format", "{{.Server.APIVersion}}")
                    .redirectErrorStream(true)
                    .start();

            if (!process.waitFor(10, TimeUnit.SECONDS)) {
                return null;
            }
            if (process.exitValue() != 0) {
                return null;
            }

            String output = new String(
                    process.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
            return output.matches("\\d+\\.\\d+") ? output : null;
        } catch (IOException e) {
            return null;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        } finally {
            if (process != null && process.isAlive()) {
                process.destroyForcibly();
            }
        }
    }
}
