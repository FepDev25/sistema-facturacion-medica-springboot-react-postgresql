package com.fepdev.sfm.backend.persistence.invoice;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.jdbc.Sql;

import com.fepdev.sfm.backend.domain.invoice.InvoiceSequence;
import com.fepdev.sfm.backend.domain.invoice.InvoiceSequenceRepository;
import com.fepdev.sfm.backend.persistence.AbstractPostgresDataJpaTest;
import com.fepdev.sfm.backend.persistence.TestJpaAuditingConfig;

import jakarta.persistence.EntityManager;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestJpaAuditingConfig.class)
@Sql(scripts = "/sql/cleanup_test_data.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class InvoiceSequenceRepositoryDataJpaTest extends AbstractPostgresDataJpaTest {

    @Autowired
    InvoiceSequenceRepository invoiceSequenceRepository;

    @Autowired
    EntityManager entityManager;

    @Test
    void findByYearForUpdate_returnsExistingSequence() {
        InvoiceSequence sequence = new InvoiceSequence();
        sequence.setYear(2026);
        sequence.setLastSequence(41);
        entityManager.persist(sequence);
        entityManager.flush();

        var loaded = invoiceSequenceRepository.findByYearForUpdate(2026);

        assertThat(loaded).isPresent();
        assertThat(loaded.get().getLastSequence()).isEqualTo(41);
    }

    @Test
    void sequenceCanBeIncrementedSafelyInTransaction() {
        InvoiceSequence sequence = new InvoiceSequence();
        sequence.setYear(2027);
        sequence.setLastSequence(1);
        entityManager.persist(sequence);
        entityManager.flush();

        var locked = invoiceSequenceRepository.findByYearForUpdate(2027).orElseThrow();
        locked.setLastSequence(locked.getLastSequence() + 1);
        entityManager.flush();
        entityManager.clear();

        var reloaded = invoiceSequenceRepository.findById(2027).orElseThrow();
        assertThat(reloaded.getLastSequence()).isEqualTo(2);
    }
}
