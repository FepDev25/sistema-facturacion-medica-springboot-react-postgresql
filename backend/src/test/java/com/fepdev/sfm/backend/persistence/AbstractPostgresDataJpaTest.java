package com.fepdev.sfm.backend.persistence;

import org.springframework.test.context.ActiveProfiles;
import org.springframework.context.annotation.Import;

@ActiveProfiles("persistence")
@Import(TestJpaAuditingConfig.class)
public abstract class AbstractPostgresDataJpaTest {
}
