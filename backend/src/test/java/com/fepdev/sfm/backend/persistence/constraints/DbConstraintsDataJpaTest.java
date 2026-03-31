package com.fepdev.sfm.backend.persistence.constraints;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.jdbc.Sql;

import com.fepdev.sfm.backend.domain.appointment.Appointment;
import com.fepdev.sfm.backend.domain.appointment.Status;
import com.fepdev.sfm.backend.domain.doctor.Doctor;
import com.fepdev.sfm.backend.domain.insurance.InsurancePolicy;
import com.fepdev.sfm.backend.domain.insurance.InsuranceProvider;
import com.fepdev.sfm.backend.domain.invoice.Invoice;
import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecord;
import com.fepdev.sfm.backend.domain.patient.Gender;
import com.fepdev.sfm.backend.domain.patient.Patient;
import com.fepdev.sfm.backend.domain.payment.Payment;
import com.fepdev.sfm.backend.domain.payment.PaymentMethod;
import com.fepdev.sfm.backend.persistence.AbstractPostgresDataJpaTest;
import com.fepdev.sfm.backend.persistence.TestJpaAuditingConfig;

import jakarta.persistence.EntityManager;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestJpaAuditingConfig.class)
@Sql(scripts = "/sql/cleanup_test_data.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class DbConstraintsDataJpaTest extends AbstractPostgresDataJpaTest {

    @Autowired
    EntityManager entityManager;

    @Test
    void paymentAmount_mustBePositive() {
        Invoice invoice = persistInvoice("FAC-2026-50001");

        Payment payment = new Payment();
        payment.setInvoice(invoice);
        payment.setAmount(BigDecimal.ZERO);
        payment.setPaymentMethod(PaymentMethod.CASH);
        payment.setPaymentDate(OffsetDateTime.now());

        assertThatThrownBy(() -> {
            entityManager.persist(payment);
            entityManager.flush();
        }).isInstanceOf(Exception.class);
    }

    @Test
    void insuranceCoveragePercentage_mustBeBetweenZeroAndHundred() {
        Patient patient = persistPatient("CNST-001");
        InsuranceProvider provider = persistProvider();

        InsurancePolicy policy = new InsurancePolicy();
        policy.setPatient(patient);
        policy.setProvider(provider);
        policy.setPolicyNumber("POL-ERR-1");
        policy.setCoveragePercentage(new BigDecimal("120.00"));
        policy.setDeductible(BigDecimal.ZERO);
        policy.setStartDate(LocalDate.now());
        policy.setEndDate(LocalDate.now().plusDays(10));
        policy.setActive(true);

        assertThatThrownBy(() -> {
            entityManager.persist(policy);
            entityManager.flush();
        }).isInstanceOf(Exception.class);
    }

    @Test
    void medicalRecord_mustBeUniquePerAppointment() {
        Patient patient = persistPatient("CNST-002");
        Doctor doctor = persistDoctor();

        Appointment appointment = new Appointment();
        appointment.setPatient(patient);
        appointment.setDoctor(doctor);
        appointment.setScheduledAt(OffsetDateTime.now().plusDays(1));
        appointment.setScheduledEndAt(OffsetDateTime.now().plusDays(1).plusMinutes(30));
        appointment.setDurationMinutes(30);
        appointment.setStatus(Status.COMPLETED);
        entityManager.persist(appointment);

        MedicalRecord first = new MedicalRecord();
        first.setPatient(patient);
        first.setAppointment(appointment);
        first.setClinicalNotes("first");
        first.setRecordDate(OffsetDateTime.now());
        entityManager.persist(first);
        entityManager.flush();

        MedicalRecord duplicate = new MedicalRecord();
        duplicate.setPatient(patient);
        duplicate.setAppointment(appointment);
        duplicate.setClinicalNotes("duplicate");
        duplicate.setRecordDate(OffsetDateTime.now());

        assertThatThrownBy(() -> {
            entityManager.persist(duplicate);
            entityManager.flush();
        }).isInstanceOf(Exception.class);
    }

    private Invoice persistInvoice(String invoiceNumber) {
        Patient patient = persistPatient("CNST-INV");
        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber(invoiceNumber);
        invoice.setPatient(patient);
        invoice.setSubtotal(new BigDecimal("100.00"));
        invoice.setTax(BigDecimal.ZERO);
        invoice.setTotal(new BigDecimal("100.00"));
        invoice.setInsuranceCoverage(BigDecimal.ZERO);
        invoice.setPatientResponsibility(new BigDecimal("100.00"));
        invoice.setStatus(InvoiceStatus.PENDING);
        invoice.setIssueDate(LocalDate.now());
        invoice.setDueDate(LocalDate.now().plusDays(5));
        invoice.setNotes("manual");
        entityManager.persist(invoice);
        entityManager.flush();
        return invoice;
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

    private Doctor persistDoctor() {
        Doctor doctor = new Doctor();
        doctor.setLicenseNumber("LIC-" + System.nanoTime());
        doctor.setFirstName("Doc");
        doctor.setLastName("Torres");
        doctor.setSpecialty("General");
        doctor.setPhone("5552222");
        doctor.setEmail("doc" + System.nanoTime() + "@mail.com");
        doctor.setActive(true);
        entityManager.persist(doctor);
        return doctor;
    }

    private InsuranceProvider persistProvider() {
        InsuranceProvider provider = new InsuranceProvider();
        provider.setName("Seguro Uno");
        provider.setCode(("SEG" + System.nanoTime()).substring(0, 12));
        provider.setPhone("5553333");
        provider.setActive(true);
        entityManager.persist(provider);
        return provider;
    }
}
