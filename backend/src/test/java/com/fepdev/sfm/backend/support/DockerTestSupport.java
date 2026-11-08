package com.fepdev.sfm.backend.support;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

/**
 * Configura docker-java/Testcontainers antes de arrancar el primer contenedor.
 *
 * docker-java 3.7.x usa por defecto la API 1.32. Los Docker Engine modernos
 * rechazan esa version con "client version 1.32 is too old", y Testcontainers
 * 1.20.x no la negocia sola. Por eso hay que fijarla explicitamente.
 *
 * Orden de precedencia:
 * 1. -Ddocker.api.version=...
 * 2. DOCKER_API_VERSION
 * 3. La version maxima que reporta el servidor con `docker version`
 * 4. 1.44 como fallback (Docker 25+)
 */
public final class DockerTestSupport {

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

        if (System.getProperty("docker.api.version") != null) {
            return;
        }

        String fromEnv = System.getenv("DOCKER_API_VERSION");
        if (fromEnv != null && !fromEnv.isBlank()) {
            System.setProperty("docker.api.version", fromEnv.trim());
            return;
        }

        String fromServer = detectServerApiVersion();
        System.setProperty(
                "docker.api.version",
                fromServer != null ? fromServer : FALLBACK_API_VERSION);
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
