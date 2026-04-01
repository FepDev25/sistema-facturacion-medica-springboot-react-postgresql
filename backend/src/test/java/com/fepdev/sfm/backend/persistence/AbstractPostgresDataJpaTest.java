package com.fepdev.sfm.backend.persistence;

import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@ActiveProfiles("persistence")
@Import(TestJpaAuditingConfig.class)
@Testcontainers
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
public abstract class AbstractPostgresDataJpaTest {

    static {
        System.setProperty("docker.host", System.getProperty("docker.host", "unix:///var/run/docker.sock"));
        System.setProperty("docker.api.version", System.getProperty("docker.api.version", "1.54"));
    }

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("fac_med_db_test")
            .withUsername("medisys")
            .withPassword("medisys_dev");
}
