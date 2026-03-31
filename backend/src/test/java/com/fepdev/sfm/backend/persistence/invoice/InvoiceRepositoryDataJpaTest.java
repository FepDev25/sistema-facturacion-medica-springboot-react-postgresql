package com.fepdev.sfm.backend.persistence.invoice;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.jdbc.Sql;

import com.fepdev.sfm.backend.domain.invoice.Invoice;
import com.fepdev.sfm.backend.domain.invoice.InvoiceRepository;
import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;
import com.fepdev.sfm.backend.domain.patient.Gender;
import com.fepdev.sfm.backend.domain.patient.Patient;
import com.fepdev.sfm.backend.persistence.AbstractPostgresDataJpaTest;
import com.fepdev.sfm.backend.persistence.TestJpaAuditingConfig;

import jakarta.persistence.EntityManager;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestJpaAuditingConfig.class)
@Sql(scripts = "/sql/cleanup_test_data.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class InvoiceRepositoryDataJpaTest extends AbstractPostgresDataJpaTest {

    @Autowired
    InvoiceRepository invoiceRepository;

    @Autowired
    EntityManager entityManager;

    @Test
    void findWithFilters_filtersByPatientStatusAndDateRange() {
        Patient patientA = persistPatient("PA-001");
        Patient patientB = persistPatient("PA-002");

        persistInvoice("FAC-2026-10001", patientA, InvoiceStatus.PENDING, LocalDate.now().minusDays(1));
        persistInvoice("FAC-2026-10002", patientA, InvoiceStatus.PAID, LocalDate.now());
        persistInvoice("FAC-2026-10003", patientB, InvoiceStatus.PAID, LocalDate.now());

        var page = invoiceRepository.findWithFilters(
                patientA.getId(),
                InvoiceStatus.PAID,
                LocalDate.now().minusDays(1),
                LocalDate.now().plusDays(1),
                PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().getFirst().getInvoiceNumber()).isEqualTo("FAC-2026-10002");
    }

    @Test
    void findWithFilters_ordersByIssueDateDesc() {
        Patient patient = persistPatient("PA-003");
        Invoice older = persistInvoice("FAC-2026-10004", patient, InvoiceStatus.PENDING, LocalDate.now().minusDays(3));
        Invoice newer = persistInvoice("FAC-2026-10005", patient, InvoiceStatus.PENDING, LocalDate.now().minusDays(1));

        var page = invoiceRepository.findWithFilters(
                patient.getId(),
                null,
                null,
                null,
                PageRequest.of(0, 10));

        assertThat(page.getContent().get(0).getId()).isEqualTo(newer.getId());
        assertThat(page.getContent().get(1).getId()).isEqualTo(older.getId());
    }

    private Patient persistPatient(String dniPrefix) {
        Patient patient = new Patient();
        patient.setDni((dniPrefix + System.nanoTime()).substring(0, 20));
        patient.setFirstName("Ana");
        patient.setLastName("Lopez");
        patient.setBirthDate(LocalDate.of(1990, 1, 1));
        patient.setGender(Gender.FEMALE);
        patient.setPhone("5551111");
        entityManager.persist(patient);
        return patient;
    }

    private Invoice persistInvoice(String number, Patient patient, InvoiceStatus status, LocalDate issueDate) {
        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber(number);
        invoice.setPatient(patient);
        invoice.setSubtotal(new BigDecimal("100.00"));
        invoice.setTax(BigDecimal.ZERO);
        invoice.setTotal(new BigDecimal("100.00"));
        invoice.setInsuranceCoverage(BigDecimal.ZERO);
        invoice.setPatientResponsibility(new BigDecimal("100.00"));
        invoice.setStatus(status);
        invoice.setIssueDate(issueDate);
        invoice.setDueDate(issueDate.plusDays(15));
        invoice.setNotes("manual");
        entityManager.persist(invoice);
        entityManager.flush();
        return invoice;
    }
}
