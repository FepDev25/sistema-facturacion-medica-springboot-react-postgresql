package com.fepdev.sfm.backend.persistence;

import java.time.OffsetDateTime;
import java.util.Optional;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.data.auditing.DateTimeProvider;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@TestConfiguration
@EnableJpaAuditing(auditorAwareRef = "testAuditorAware", dateTimeProviderRef = "testDateTimeProvider")
public class TestJpaAuditingConfig {

    @Bean("testAuditorAware")
    AuditorAware<String> testAuditorAware() {
        return () -> Optional.of("datajpa-test");
    }

    @Bean("testDateTimeProvider")
    DateTimeProvider testDateTimeProvider() {
        return () -> Optional.of(OffsetDateTime.now());
    }
}
