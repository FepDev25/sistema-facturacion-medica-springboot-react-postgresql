package com.fepdev.sfm.backend.persistence.converter;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;

import com.fepdev.sfm.backend.domain.appointment.Appointment;
import com.fepdev.sfm.backend.domain.appointment.Status;
import com.fepdev.sfm.backend.domain.doctor.Doctor;
import com.fepdev.sfm.backend.domain.invoice.Invoice;
import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;
import com.fepdev.sfm.backend.domain.medicalrecord.Diagnosis;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecord;
import com.fepdev.sfm.backend.domain.medicalrecord.Severity;
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
class EnumConvertersDataJpaTest extends AbstractPostgresDataJpaTest {

    @Autowired
    EntityManager entityManager;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Test
    void converters_persistEnumsAsLowercaseValues() {
        Patient patient = persistPatient();
        Doctor doctor = persistDoctor();

        Appointment appointment = new Appointment();
        appointment.setPatient(patient);
        appointment.setDoctor(doctor);
        appointment.setScheduledAt(OffsetDateTime.now().plusDays(1));
        appointment.setScheduledEndAt(OffsetDateTime.now().plusDays(1).plusMinutes(30));
        appointment.setDurationMinutes(30);
        appointment.setStatus(Status.CONFIRMED);
        entityManager.persist(appointment);

        Invoice invoice = new Invoice();
        invoice.setPatient(patient);
        invoice.setInvoiceNumber("FAC-2026-30001");
        invoice.setSubtotal(new BigDecimal("10.00"));
        invoice.setTax(BigDecimal.ZERO);
        invoice.setTotal(new BigDecimal("10.00"));
        invoice.setInsuranceCoverage(BigDecimal.ZERO);
        invoice.setPatientResponsibility(new BigDecimal("10.00"));
        invoice.setStatus(InvoiceStatus.PENDING);
        invoice.setIssueDate(LocalDate.now());
        invoice.setDueDate(LocalDate.now().plusDays(5));
        invoice.setNotes("manual");
        entityManager.persist(invoice);

        Payment payment = new Payment();
        payment.setInvoice(invoice);
        payment.setAmount(new BigDecimal("10.00"));
        payment.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        payment.setPaymentDate(OffsetDateTime.now());
        entityManager.persist(payment);

        MedicalRecord medicalRecord = new MedicalRecord();
        medicalRecord.setPatient(patient);
        medicalRecord.setAppointment(appointment);
        medicalRecord.setClinicalNotes("ok");
        medicalRecord.setRecordDate(OffsetDateTime.now());
        entityManager.persist(medicalRecord);

        Diagnosis diagnosis = new Diagnosis();
        diagnosis.setAppointment(appointment);
        diagnosis.setMedicalRecord(medicalRecord);
        diagnosis.setIcd10Code("J00");
        diagnosis.setDescription("resfriado");
        diagnosis.setSeverity(Severity.MODERATE);
        diagnosis.setDiagnosedAt(OffsetDateTime.now());
        entityManager.persist(diagnosis);

        entityManager.flush();

        String appointmentStatus = jdbcTemplate.queryForObject(
                "select status from appointments where id = ?", String.class, appointment.getId());
        String invoiceStatus = jdbcTemplate.queryForObject(
                "select status from invoices where id = ?", String.class, invoice.getId());
        String paymentMethod = jdbcTemplate.queryForObject(
                "select payment_method from payments where id = ?", String.class, payment.getId());
        String diagnosisSeverity = jdbcTemplate.queryForObject(
                "select severity from diagnoses where id = ?", String.class, diagnosis.getId());
        String patientGender = jdbcTemplate.queryForObject(
                "select gender from patients where id = ?", String.class, patient.getId());

        assertThat(appointmentStatus).isEqualTo("confirmed");
        assertThat(invoiceStatus).isEqualTo("pending");
        assertThat(paymentMethod).isEqualTo("bank_transfer");
        assertThat(diagnosisSeverity).isEqualTo("moderate");
        assertThat(patientGender).isEqualTo("female");
    }

    private Patient persistPatient() {
        Patient patient = new Patient();
        patient.setDni("CV-100");
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
        doctor.setLicenseNumber("CV-LIC-1");
        doctor.setFirstName("Doc");
        doctor.setLastName("Torres");
        doctor.setSpecialty("General");
        doctor.setPhone("5552222");
        doctor.setEmail("doc@clinic.com");
        doctor.setActive(true);
        entityManager.persist(doctor);
        return doctor;
    }
}
