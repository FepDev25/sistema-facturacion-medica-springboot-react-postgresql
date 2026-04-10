package com.fepdev.sfm.backend.domain.appointment;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentCreateRequest;
import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentUpdateRequest;
import com.fepdev.sfm.backend.domain.doctor.Doctor;
import com.fepdev.sfm.backend.domain.patient.Patient;

class AppointmentMapperImplTest {

    private final AppointmentMapper mapper = new AppointmentMapperImpl();

    @Test
    void toEntity_mapsRequestFields() {
        AppointmentCreateRequest request = new AppointmentCreateRequest(
                UUID.randomUUID(), UUID.randomUUID(), OffsetDateTime.now().plusDays(1), 30, "Control", "nota");

        Appointment entity = mapper.toEntity(request);

        assertThat(entity.getScheduledAt()).isEqualTo(request.scheduledAt());
        assertThat(entity.getDurationMinutes()).isEqualTo(30);
        assertThat(entity.getChiefComplaint()).isEqualTo("Control");
        assertThat(entity.getPatient()).isNull();
        assertThat(entity.getDoctor()).isNull();
    }

    @Test
    void toResponse_mapsNestedData() {
        UUID patientId = UUID.randomUUID();
        UUID doctorId = UUID.randomUUID();
        Patient patient = new Patient();
        ReflectionTestUtils.setField(patient, "id", patientId);
        patient.setFirstName("Ana");
        patient.setLastName("Lopez");
        Doctor doctor = new Doctor();
        ReflectionTestUtils.setField(doctor, "id", doctorId);
        doctor.setFirstName("Luis");
        doctor.setLastName("Torres");

        Appointment appointment = new Appointment();
        ReflectionTestUtils.setField(appointment, "id", UUID.randomUUID());
        appointment.setPatient(patient);
        appointment.setDoctor(doctor);
        appointment.setScheduledAt(OffsetDateTime.now().plusDays(1));
        appointment.setScheduledEndAt(OffsetDateTime.now().plusDays(1).plusMinutes(30));
        appointment.setDurationMinutes(30);
        appointment.setStatus(Status.CONFIRMED);

        var response = mapper.toResponse(appointment);

        assertThat(response.patientId()).isEqualTo(patientId);
        assertThat(response.doctorId()).isEqualTo(doctorId);
        assertThat(response.status()).isEqualTo(Status.CONFIRMED);
    }

    @Test
    void updateEntity_ignoresNullFieldsAndStatus() {
        Appointment appointment = new Appointment();
        appointment.setScheduledAt(OffsetDateTime.now().plusDays(1));
        appointment.setDurationMinutes(30);
        appointment.setChiefComplaint("Inicial");
        appointment.setNotes("Nota inicial");
        appointment.setStatus(Status.CONFIRMED);

        mapper.updateEntity(new AppointmentUpdateRequest(null, 45, null, "Nueva nota"), appointment);

        assertThat(appointment.getDurationMinutes()).isEqualTo(45);
        assertThat(appointment.getChiefComplaint()).isEqualTo("Inicial");
        assertThat(appointment.getNotes()).isEqualTo("Nueva nota");
        assertThat(appointment.getStatus()).isEqualTo(Status.CONFIRMED);
    }

    @Test
    void toSummaryResponse_andList_mapsNamesAndStatus() {
        Patient patient = new Patient();
        patient.setFirstName("Ana");
        patient.setLastName("Lopez");

        Doctor doctor = new Doctor();
        doctor.setFirstName("Luis");
        doctor.setLastName("Torres");

        Appointment appointment = new Appointment();
        ReflectionTestUtils.setField(appointment, "id", UUID.randomUUID());
        appointment.setPatient(patient);
        appointment.setDoctor(doctor);
        appointment.setScheduledAt(OffsetDateTime.now().plusDays(1));
        appointment.setStatus(Status.SCHEDULED);

        var summary = mapper.toSummaryResponse(appointment);
        var list = mapper.toSummaryResponseList(List.of(appointment));

        assertThat(summary.patientFirstName()).isEqualTo("Ana");
        assertThat(summary.doctorLastName()).isEqualTo("Torres");
        assertThat(summary.status()).isEqualTo(Status.SCHEDULED);
        assertThat(list).hasSize(1);
        assertThat(list.getFirst().patientLastName()).isEqualTo("Lopez");
    }

    @Test
    void mapper_nullInputs_returnNullOrNoOp() {
        Appointment appointment = new Appointment();
        appointment.setNotes("kept");

        assertThat(mapper.toEntity(null)).isNull();
        mapper.updateEntity(null, appointment);
        assertThat(appointment.getNotes()).isEqualTo("kept");

        assertThat(mapper.toResponse(null)).isNull();
        assertThat(mapper.toSummaryResponse(null)).isNull();
        assertThat(mapper.toResponseList(null)).isNull();
        assertThat(mapper.toSummaryResponseList(null)).isNull();
    }

    @Test
    void toResponse_whenPatientAndDoctorNull_setsNestedIdsAsNull() {
        Appointment appointment = new Appointment();
        ReflectionTestUtils.setField(appointment, "id", UUID.randomUUID());
        appointment.setScheduledAt(OffsetDateTime.now().plusDays(1));
        appointment.setDurationMinutes(30);
        appointment.setStatus(Status.SCHEDULED);

        var response = mapper.toResponse(appointment);
        var summary = mapper.toSummaryResponse(appointment);

        assertThat(response.patientId()).isNull();
        assertThat(response.doctorId()).isNull();
        assertThat(summary.patientFirstName()).isNull();
        assertThat(summary.doctorFirstName()).isNull();
    }

    @Test
    void updateEntity_whenAllFieldsPresent_overwritesValues() {
        OffsetDateTime oldDate = OffsetDateTime.now().plusDays(1);
        OffsetDateTime newDate = oldDate.plusDays(1);
        Appointment appointment = new Appointment();
        appointment.setScheduledAt(oldDate);
        appointment.setDurationMinutes(20);
        appointment.setChiefComplaint("Inicial");
        appointment.setNotes("Inicial");

        mapper.updateEntity(new AppointmentUpdateRequest(newDate, 60, "Nuevo motivo", "Nuevas notas"), appointment);

        assertThat(appointment.getScheduledAt()).isEqualTo(newDate);
        assertThat(appointment.getDurationMinutes()).isEqualTo(60);
        assertThat(appointment.getChiefComplaint()).isEqualTo("Nuevo motivo");
        assertThat(appointment.getNotes()).isEqualTo("Nuevas notas");
    }

    @Test
    void updateEntity_whenAllFieldsNull_keepsOriginalValues() {
        OffsetDateTime date = OffsetDateTime.now().plusDays(1);
        Appointment appointment = new Appointment();
        appointment.setScheduledAt(date);
        appointment.setDurationMinutes(30);
        appointment.setChiefComplaint("Motivo");
        appointment.setNotes("Notas");

        mapper.updateEntity(new AppointmentUpdateRequest(null, null, null, null), appointment);

        assertThat(appointment.getScheduledAt()).isEqualTo(date);
        assertThat(appointment.getDurationMinutes()).isEqualTo(30);
        assertThat(appointment.getChiefComplaint()).isEqualTo("Motivo");
        assertThat(appointment.getNotes()).isEqualTo("Notas");
    }
}
