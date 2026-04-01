package com.fepdev.sfm.backend.domain.medicalrecord;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.domain.appointment.Appointment;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.DiagnosisCreateRequest;

class DiagnosisMapperImplTest {

    private final DiagnosisMapper mapper = new DiagnosisMapperImpl();

    @Test
    void toEntity_mapsCreateRequest() {
        OffsetDateTime diagnosedAt = OffsetDateTime.now();
        DiagnosisCreateRequest request = new DiagnosisCreateRequest(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "J02.9",
                "Faringitis aguda",
                Severity.MILD,
                diagnosedAt);

        Diagnosis entity = mapper.toEntity(request);

        assertThat(entity.getIcd10Code()).isEqualTo("J02.9");
        assertThat(entity.getDescription()).isEqualTo("Faringitis aguda");
        assertThat(entity.getSeverity()).isEqualTo(Severity.MILD);
        assertThat(entity.getDiagnosedAt()).isEqualTo(diagnosedAt);
        assertThat(entity.getAppointment()).isNull();
        assertThat(entity.getMedicalRecord()).isNull();
    }

    @Test
    void toResponse_and_toResponseList_mapIds() {
        UUID diagnosisId = UUID.randomUUID();
        UUID appointmentId = UUID.randomUUID();
        UUID medicalRecordId = UUID.randomUUID();

        Appointment appointment = new Appointment();
        ReflectionTestUtils.setField(appointment, "id", appointmentId);
        MedicalRecord medicalRecord = new MedicalRecord();
        ReflectionTestUtils.setField(medicalRecord, "id", medicalRecordId);

        Diagnosis entity = new Diagnosis();
        ReflectionTestUtils.setField(entity, "id", diagnosisId);
        entity.setAppointment(appointment);
        entity.setMedicalRecord(medicalRecord);
        entity.setIcd10Code("A09");
        entity.setDescription("Gastroenteritis");
        entity.setSeverity(Severity.SEVERE);
        entity.setDiagnosedAt(OffsetDateTime.now());

        var response = mapper.toResponse(entity);
        var list = mapper.toResponseList(List.of(entity));

        assertThat(response.id()).isEqualTo(diagnosisId);
        assertThat(response.appointmentId()).isEqualTo(appointmentId);
        assertThat(response.medicalRecordId()).isEqualTo(medicalRecordId);
        assertThat(response.severity()).isEqualTo(Severity.SEVERE);
        assertThat(list).hasSize(1);
        assertThat(list.getFirst().id()).isEqualTo(diagnosisId);
    }
}
