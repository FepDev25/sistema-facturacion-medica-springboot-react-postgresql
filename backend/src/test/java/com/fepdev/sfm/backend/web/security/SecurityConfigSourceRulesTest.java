package com.fepdev.sfm.backend.web.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

class SecurityConfigSourceRulesTest {

    private static final Path SECURITY_CONFIG = Path.of(
            "src/main/java/com/fepdev/sfm/backend/config/SecurityConfig.java");

    @Test
    void containsCriticalAuthorizationRules_forPhase11() throws IOException {
        String code = Files.readString(SECURITY_CONFIG);

        assertThat(code).contains(".requestMatchers(HttpMethod.POST, \"/api/v1/patients\").hasAnyAuthority(\"ADMIN\", \"RECEPTIONIST\")");
        assertThat(code).contains(".requestMatchers(HttpMethod.POST, \"/api/v1/payments\").hasAnyAuthority(\"ADMIN\", \"RECEPTIONIST\")");
        assertThat(code).contains(".requestMatchers(HttpMethod.PATCH, \"/api/v1/appointments/*/complete\").hasAuthority(\"DOCTOR\")");
    }

    @Test
    void keepsAuthAndHealthPublic() throws IOException {
        String code = Files.readString(SECURITY_CONFIG);

        assertThat(code).contains(".requestMatchers(\"/api/v1/auth/**\").permitAll()");
        assertThat(code).contains(".requestMatchers(\"/actuator/health\").permitAll()");
    }
}
