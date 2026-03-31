package com.fepdev.sfm.backend.persistence.appointment;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.jdbc.Sql;

import com.fepdev.sfm.backend.domain.appointment.Appointment;
import com.fepdev.sfm.backend.domain.appointment.AppointmentRepository;
import com.fepdev.sfm.backend.domain.appointment.Status;
import com.fepdev.sfm.backend.domain.doctor.Doctor;
import com.fepdev.sfm.backend.domain.patient.Gender;
import com.fepdev.sfm.backend.domain.patient.Patient;
import com.fepdev.sfm.backend.persistence.AbstractPostgresDataJpaTest;
import com.fepdev.sfm.backend.persistence.TestJpaAuditingConfig;

import jakarta.persistence.EntityManager;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestJpaAuditingConfig.class)
@Sql(scripts = "/sql/cleanup_test_data.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class AppointmentRepositoryDataJpaTest extends AbstractPostgresDataJpaTest {

    @Autowired
    AppointmentRepository appointmentRepository;

    @Autowired
    EntityManager entityManager;

    @Test
    void hasScheduleConflict_returnsTrueForOverlappingAppointment() {
        Patient patient = persistPatient("10001");
        Doctor doctor = persistDoctor("LIC-100");

        OffsetDateTime start = OffsetDateTime.now().plusDays(1).withHour(10).withMinute(0).withSecond(0).withNano(0);
        persistAppointment(patient, doctor, start, start.plusMinutes(30), Status.SCHEDULED);

        boolean conflict = appointmentRepository.hasScheduleConflict(
                doctor.getId(),
                start.plusMinutes(15),
                start.plusMinutes(45),
                List.of(Status.CANCELLED, Status.NO_SHOW));

        assertThat(conflict).isTrue();
    }

    @Test
    void hasScheduleConflict_ignoresCancelledAndNoShow() {
        Patient patient = persistPatient("10002");
        Doctor doctor = persistDoctor("LIC-101");
        OffsetDateTime start = OffsetDateTime.now().plusDays(1).withHour(11).withMinute(0).withSecond(0).withNano(0);

        persistAppointment(patient, doctor, start, start.plusMinutes(30), Status.CANCELLED);

        boolean conflict = appointmentRepository.hasScheduleConflict(
                doctor.getId(),
                start.plusMinutes(10),
                start.plusMinutes(20),
                List.of(Status.CANCELLED, Status.NO_SHOW));

        assertThat(conflict).isFalse();
    }

    @Test
    void findWithFilters_filtersByDoctorStatusAndDateRange() {
        Patient patient = persistPatient("10003");
        Doctor doctor = persistDoctor("LIC-102");

        OffsetDateTime base = OffsetDateTime.now().plusDays(2).withHour(8).withMinute(0).withSecond(0).withNano(0);
        persistAppointment(patient, doctor, base, base.plusMinutes(30), Status.SCHEDULED);
        persistAppointment(patient, doctor, base.plusHours(1), base.plusHours(1).plusMinutes(30), Status.COMPLETED);

        var page = appointmentRepository.findWithFilters(
                doctor.getId(),
                null,
                Status.COMPLETED,
                base,
                base.plusDays(1),
                PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().getFirst().getStatus()).isEqualTo(Status.COMPLETED);
    }

    private Patient persistPatient(String dni) {
        Patient patient = new Patient();
        patient.setDni(dni);
        patient.setFirstName("Ana");
        patient.setLastName("Lopez");
        patient.setBirthDate(java.time.LocalDate.of(1990, 1, 1));
        patient.setGender(Gender.FEMALE);
        patient.setPhone("5551111");
        patient.setEmail(dni + "@mail.com");
        entityManager.persist(patient);
        return patient;
    }

    private Doctor persistDoctor(String license) {
        Doctor doctor = new Doctor();
        doctor.setLicenseNumber(license);
        doctor.setFirstName("Doc");
        doctor.setLastName("Torres");
        doctor.setSpecialty("Cardiology");
        doctor.setPhone("5552222");
        doctor.setEmail(license + "@clinic.com");
        doctor.setActive(true);
        entityManager.persist(doctor);
        return doctor;
    }

    private void persistAppointment(Patient patient, Doctor doctor, OffsetDateTime start, OffsetDateTime end, Status status) {
        Appointment appointment = new Appointment();
        appointment.setPatient(patient);
        appointment.setDoctor(doctor);
        appointment.setScheduledAt(start);
        appointment.setScheduledEndAt(end);
        appointment.setDurationMinutes(30);
        appointment.setStatus(status);
        appointment.setChiefComplaint("checkup");
        entityManager.persist(appointment);
        entityManager.flush();
    }
}
