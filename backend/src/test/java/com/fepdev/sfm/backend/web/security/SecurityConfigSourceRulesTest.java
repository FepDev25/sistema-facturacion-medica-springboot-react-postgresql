package com.fepdev.sfm.backend.web.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class SecurityConfigSourceRulesTest {

    private static final Path SECURITY_CONFIG =
            Path.of("src/main/java/com/fepdev/sfm/backend/config/SecurityConfig.java");

    @Test
    void containsCriticalAuthorizationRules_forPhase11() throws IOException {
        String code = compact(Files.readString(SECURITY_CONFIG));

        assertContains(
                code,
                ".requestMatchers(HttpMethod.POST, \"/api/v1/patients\").hasAnyAuthority(\"ADMIN\", \"RECEPTIONIST\")");
        assertContains(
                code,
                ".requestMatchers(HttpMethod.POST, \"/api/v1/payments\").hasAnyAuthority(\"ADMIN\", \"RECEPTIONIST\")");
        assertContains(
                code,
                ".requestMatchers(HttpMethod.GET, \"/api/v1/invoices/**\").hasAnyAuthority(\"ADMIN\", \"RECEPTIONIST\")");
        assertContains(code, ".requestMatchers(HttpMethod.POST, \"/api/v1/invoices/**\").hasAuthority(\"ADMIN\")");
        assertContains(code, ".requestMatchers(HttpMethod.PATCH, \"/api/v1/invoices/**\").hasAuthority(\"ADMIN\")");
        assertContains(code, ".requestMatchers(HttpMethod.DELETE, \"/api/v1/invoices/**\").hasAuthority(\"ADMIN\")");
        assertContains(
                code,
                ".requestMatchers(HttpMethod.GET, \"/api/v1/payments/**\").hasAnyAuthority(\"ADMIN\", \"RECEPTIONIST\")");
        assertContains(code, ".requestMatchers(HttpMethod.POST, \"/api/v1/ai/patients/*/reindex\")");
        assertContains(code, ".hasAuthority(\"ADMIN\")");
        assertContains(
                code,
                ".requestMatchers(HttpMethod.PATCH, \"/api/v1/appointments/*/complete\").hasAuthority(\"DOCTOR\")");
        assertContains(code, ".requestMatchers(HttpMethod.POST, \"/api/v1/doctors\").hasAuthority(\"ADMIN\")");
        assertContains(code, ".requestMatchers(HttpMethod.POST, \"/api/v1/insurance/**\").hasAuthority(\"ADMIN\")");
        assertContains(code, ".requestMatchers(HttpMethod.POST, \"/api/v1/catalog/**\").hasAuthority(\"ADMIN\")");
    }

    @Test
    void keepsAuthAndHealthPublic() throws IOException {
        String code = compact(Files.readString(SECURITY_CONFIG));

        assertContains(code, ".requestMatchers(\"/api/v1/auth/**\").permitAll()");
        assertContains(code, ".requestMatchers(\"/actuator/health\").permitAll()");
    }

    /**
     * Compara el código sin espacios para no acoplar el test al formateador.
     */
    private static String compact(String source) {
        return source.replaceAll("\\s+", "");
    }

    private static void assertContains(String compactCode, String expression) {
        assertThat(compactCode).contains(compact(expression));
    }
}
