package com.fepdev.sfm.backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

class LoginAttemptServiceTest {

    private final AtomicLong now = new AtomicLong(Instant.parse("2026-01-01T10:00:00Z").toEpochMilli());
    private final Clock clock = new Clock() {
        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return Instant.ofEpochMilli(now.get());
        }

        @Override
        public long millis() {
            return now.get();
        }
    };

    private SimpleMeterRegistry meterRegistry;
    private LoginAttemptService service;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        service = new LoginAttemptService(clock, meterRegistry, 3, 5, 60);
    }

    @Test
    void allowsAttemptsBelowTheIdentityLimit() {
        service.checkAllowed("10.0.0.1", "admin");
        service.recordFailure("10.0.0.1", "admin");
        service.recordFailure("10.0.0.1", "admin");

        service.checkAllowed("10.0.0.1", "admin");
    }

    @Test
    void blocksAfterIdentityLimitWithRetryAfter() {
        for (int i = 0; i < 3; i++) {
            service.recordFailure("10.0.0.1", "admin");
        }

        assertThatThrownBy(() -> service.checkAllowed("10.0.0.1", "admin"))
                .isInstanceOfSatisfying(LoginBlockedException.class, ex -> {
                    assertThat(ex.getRetryAfterSeconds()).isBetween(1L, 60L);
                    assertThat(ex.getMessage()).contains("Demasiados intentos");
                });

        assertThat(meterRegistry.counter("auth.login.blocked").count()).isEqualTo(1.0);
        assertThat(meterRegistry.counter("auth.login.failures").count()).isEqualTo(3.0);
    }

    @Test
    void identityIsScopedByIp() {
        for (int i = 0; i < 3; i++) {
            service.recordFailure("10.0.0.1", "admin");
        }

        service.checkAllowed("10.0.0.2", "admin");
    }

    @Test
    void blocksTheWholeIpAfterTheIpLimit() {
        service.recordFailure("10.0.0.1", "user1");
        service.recordFailure("10.0.0.1", "user2");
        service.recordFailure("10.0.0.1", "user3");
        service.recordFailure("10.0.0.1", "user4");
        service.recordFailure("10.0.0.1", "user5");

        assertThatThrownBy(() -> service.checkAllowed("10.0.0.1", "user6"))
                .isInstanceOf(LoginBlockedException.class);
    }

    @Test
    void successfulLoginClearsTheIdentityCounter() {
        service.recordFailure("10.0.0.1", "admin");
        service.recordFailure("10.0.0.1", "admin");
        service.recordSuccess("10.0.0.1", "admin");
        service.checkAllowed("10.0.0.1", "admin");

        for (int i = 0; i < 2; i++) {
            service.recordFailure("10.0.0.1", "admin");
        }
        service.checkAllowed("10.0.0.1", "admin");
    }

    @Test
    void windowRolloverResetsCounters() {
        for (int i = 0; i < 3; i++) {
            service.recordFailure("10.0.0.1", "admin");
        }
        assertThatThrownBy(() -> service.checkAllowed("10.0.0.1", "admin"))
                .isInstanceOf(LoginBlockedException.class);

        now.addAndGet(61_000);

        service.checkAllowed("10.0.0.1", "admin");
    }

    @Test
    void usernameIsNormalized() {
        service.recordFailure("10.0.0.1", " Admin ");
        service.recordFailure("10.0.0.1", "admin");
        service.recordFailure("10.0.0.1", "ADMIN");

        assertThatThrownBy(() -> service.checkAllowed("10.0.0.1", "admin"))
                .isInstanceOf(LoginBlockedException.class);
    }
}
