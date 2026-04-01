package com.fepdev.sfm.backend.domain.medicalrecord;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.domain.appointment.Appointment;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.MedicalRecordCreateRequest;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.MedicalRecordUpdateRequest;
import com.fepdev.sfm.backend.domain.patient.Patient;

class MedicalRecordMapperImplTest {

    private final MedicalRecordMapper mapper = new MedicalRecordMapperImpl();

    @Test
    void toEntity_mapsCreateRequest() {
        OffsetDateTime now = OffsetDateTime.now();
        MedicalRecordCreateRequest request = new MedicalRecordCreateRequest(
                UUID.randomUUID(),
                UUID.randomUUID(),
                Map.of("hr", 72),
                "normal",
                "clinica",
                now);

        MedicalRecord entity = mapper.toEntity(request);

        assertThat(entity.getVitalSigns()).containsEntry("hr", 72);
        assertThat(entity.getPhysicalExam()).isEqualTo("normal");
        assertThat(entity.getClinicalNotes()).isEqualTo("clinica");
        assertThat(entity.getRecordDate()).isEqualTo(now);
        assertThat(entity.getPatient()).isNull();
        assertThat(entity.getAppointment()).isNull();
    }

    @Test
    void updateEntity_ignoresNullFields() {
        MedicalRecord entity = new MedicalRecord();
        entity.setVitalSigns(Map.of("temp", 36.5));
        entity.setPhysicalExam("previo");
        entity.setClinicalNotes("nota previa");

        mapper.updateEntity(new MedicalRecordUpdateRequest(null, null, "nota nueva"), entity);

        assertThat(entity.getVitalSigns()).containsEntry("temp", 36.5);
        assertThat(entity.getPhysicalExam()).isEqualTo("previo");
        assertThat(entity.getClinicalNotes()).isEqualTo("nota nueva");
    }

    @Test
    void toResponse_and_toResponseList_mapNestedData() {
        UUID patientId = UUID.randomUUID();
        UUID appointmentId = UUID.randomUUID();
        UUID recordId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now();

        Patient patient = new Patient();
        ReflectionTestUtils.setField(patient, "id", patientId);
        patient.setFirstName("Ana");
        patient.setLastName("Lopez");

        Appointment appointment = new Appointment();
        ReflectionTestUtils.setField(appointment, "id", appointmentId);

        MedicalRecord entity = new MedicalRecord();
        ReflectionTestUtils.setField(entity, "id", recordId);
        entity.setPatient(patient);
        entity.setAppointment(appointment);
        entity.setVitalSigns(Map.of("bp", "120/80"));
        entity.setPhysicalExam("ok");
        entity.setClinicalNotes("estable");
        entity.setRecordDate(now);

        var response = mapper.toResponse(entity);
        var list = mapper.toResponseList(List.of(entity));

        assertThat(response.id()).isEqualTo(recordId);
        assertThat(response.patientId()).isEqualTo(patientId);
        assertThat(response.patientFirstName()).isEqualTo("Ana");
        assertThat(response.patientLastName()).isEqualTo("Lopez");
        assertThat(response.appointmentId()).isEqualTo(appointmentId);
        assertThat(list).hasSize(1);
        assertThat(list.getFirst().id()).isEqualTo(recordId);
    }
}
