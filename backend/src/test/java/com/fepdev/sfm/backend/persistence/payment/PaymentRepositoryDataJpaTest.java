package com.fepdev.sfm.backend.persistence.payment;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.jdbc.Sql;

import com.fepdev.sfm.backend.domain.invoice.Invoice;
import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;
import com.fepdev.sfm.backend.domain.patient.Gender;
import com.fepdev.sfm.backend.domain.patient.Patient;
import com.fepdev.sfm.backend.domain.payment.Payment;
import com.fepdev.sfm.backend.domain.payment.PaymentMethod;
import com.fepdev.sfm.backend.domain.payment.PaymentRepository;
import com.fepdev.sfm.backend.persistence.AbstractPostgresDataJpaTest;
import com.fepdev.sfm.backend.persistence.TestJpaAuditingConfig;

import jakarta.persistence.EntityManager;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestJpaAuditingConfig.class)
@Sql(scripts = "/sql/cleanup_test_data.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class PaymentRepositoryDataJpaTest extends AbstractPostgresDataJpaTest {

    @Autowired
    PaymentRepository paymentRepository;

    @Autowired
    EntityManager entityManager;

    @Test
    void sumAmountByInvoiceId_returnsZeroWhenNoPayments() {
        Invoice invoice = persistInvoice("FAC-2026-90001");

        BigDecimal sum = paymentRepository.sumAmountByInvoiceId(invoice.getId());

        assertThat(sum).isEqualByComparingTo("0");
    }

    @Test
    void sumAmountByInvoiceId_returnsSumWhenPaymentsExist() {
        Invoice invoice = persistInvoice("FAC-2026-90002");
        persistPayment(invoice, new BigDecimal("20.00"), OffsetDateTime.now().minusHours(1));
        persistPayment(invoice, new BigDecimal("30.50"), OffsetDateTime.now());

        BigDecimal sum = paymentRepository.sumAmountByInvoiceId(invoice.getId());

        assertThat(sum).isEqualByComparingTo("50.50");
    }

    @Test
    void findByInvoiceIdOrderByPaymentDateDesc_returnsSortedPage() {
        Invoice invoice = persistInvoice("FAC-2026-90003");
        Payment first = persistPayment(invoice, new BigDecimal("10.00"), OffsetDateTime.now().minusDays(1));
        Payment second = persistPayment(invoice, new BigDecimal("15.00"), OffsetDateTime.now());

        var page = paymentRepository.findByInvoiceIdOrderByPaymentDateDesc(invoice.getId(), PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent().get(0).getId()).isEqualTo(second.getId());
        assertThat(page.getContent().get(1).getId()).isEqualTo(first.getId());
    }

    private Invoice persistInvoice(String invoiceNumber) {
        Patient patient = new Patient();
        patient.setDni(("DNI" + UUID.randomUUID().toString().replace("-", "")).substring(0, 20));
        patient.setFirstName("Ana");
        patient.setLastName("Lopez");
        patient.setBirthDate(LocalDate.of(1990, 1, 1));
        patient.setGender(Gender.FEMALE);
        patient.setPhone("5551111");
        entityManager.persist(patient);

        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber(invoiceNumber);
        invoice.setPatient(patient);
        invoice.setSubtotal(new BigDecimal("100.00"));
        invoice.setTax(new BigDecimal("0.00"));
        invoice.setTotal(new BigDecimal("100.00"));
        invoice.setInsuranceCoverage(BigDecimal.ZERO);
        invoice.setPatientResponsibility(new BigDecimal("100.00"));
        invoice.setStatus(InvoiceStatus.PENDING);
        invoice.setIssueDate(LocalDate.now());
        invoice.setDueDate(LocalDate.now().plusDays(10));
        invoice.setNotes("without appointment");
        entityManager.persist(invoice);
        return invoice;
    }

    private Payment persistPayment(Invoice invoice, BigDecimal amount, OffsetDateTime paymentDate) {
        Payment payment = new Payment();
        payment.setInvoice(invoice);
        payment.setAmount(amount);
        payment.setPaymentMethod(PaymentMethod.CASH);
        payment.setPaymentDate(paymentDate);
        entityManager.persist(payment);
        entityManager.flush();
        return payment;
    }
}
