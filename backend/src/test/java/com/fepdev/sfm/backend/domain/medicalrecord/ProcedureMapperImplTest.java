package com.fepdev.sfm.backend.domain.medicalrecord;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.domain.appointment.Appointment;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.ProcedureCreateRequest;

class ProcedureMapperImplTest {

    private final ProcedureMapper mapper = new ProcedureMapperImpl();

    @Test
    void toEntity_mapsCreateRequest() {
        OffsetDateTime performedAt = OffsetDateTime.now();
        ProcedureCreateRequest request = new ProcedureCreateRequest(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "PROC-001",
                "Sutura",
                "sin complicaciones",
                performedAt);

        Procedure entity = mapper.toEntity(request);

        assertThat(entity.getProcedureCode()).isEqualTo("PROC-001");
        assertThat(entity.getDescription()).isEqualTo("Sutura");
        assertThat(entity.getNotes()).isEqualTo("sin complicaciones");
        assertThat(entity.getPerformedAt()).isEqualTo(performedAt);
        assertThat(entity.getAppointment()).isNull();
        assertThat(entity.getMedicalRecord()).isNull();
    }

    @Test
    void toResponse_and_toResponseList_mapIds() {
        UUID procedureId = UUID.randomUUID();
        UUID appointmentId = UUID.randomUUID();
        UUID medicalRecordId = UUID.randomUUID();

        Appointment appointment = new Appointment();
        ReflectionTestUtils.setField(appointment, "id", appointmentId);
        MedicalRecord medicalRecord = new MedicalRecord();
        ReflectionTestUtils.setField(medicalRecord, "id", medicalRecordId);

        Procedure entity = new Procedure();
        ReflectionTestUtils.setField(entity, "id", procedureId);
        entity.setAppointment(appointment);
        entity.setMedicalRecord(medicalRecord);
        entity.setProcedureCode("PROC-002");
        entity.setDescription("Curacion");
        entity.setNotes("ok");
        entity.setPerformedAt(OffsetDateTime.now());

        var response = mapper.toResponse(entity);
        var list = mapper.toResponseList(List.of(entity));

        assertThat(response.id()).isEqualTo(procedureId);
        assertThat(response.appointmentId()).isEqualTo(appointmentId);
        assertThat(response.medicalRecordId()).isEqualTo(medicalRecordId);
        assertThat(list).hasSize(1);
        assertThat(list.getFirst().id()).isEqualTo(procedureId);
    }
}
