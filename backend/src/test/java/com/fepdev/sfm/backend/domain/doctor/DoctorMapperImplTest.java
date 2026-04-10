package com.fepdev.sfm.backend.domain.doctor;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.domain.doctor.dto.DoctorCreateRequest;
import com.fepdev.sfm.backend.domain.doctor.dto.DoctorUpdateRequest;

class DoctorMapperImplTest {

    private final DoctorMapper mapper = new DoctorMapperImpl();

    @Test
    void toEntity_toResponse_and_listMappings_mapExpectedFields() {
        DoctorCreateRequest create = new DoctorCreateRequest(
                "LIC-001", "Ana", "Lopez", "Cardiologia", "555", "ana@x.com", null);

        Doctor entity = mapper.toEntity(create);
        ReflectionTestUtils.setField(entity, "id", UUID.randomUUID());
        entity.setActive(true);

        assertThat(entity.getLicenseNumber()).isEqualTo("LIC-001");
        assertThat(entity.getFirstName()).isEqualTo("Ana");
        assertThat(entity.isActive()).isTrue();

        var response = mapper.toResponse(entity);
        var summary = mapper.toSummaryResponse(entity);
        var responses = mapper.toResponseList(List.of(entity));
        var summaries = mapper.toSummaryResponseList(List.of(entity));

        assertThat(response.id()).isNotNull();
        assertThat(response.isActive()).isTrue();
        assertThat(summary.specialty()).isEqualTo("Cardiologia");
        assertThat(responses).hasSize(1);
        assertThat(summaries).hasSize(1);
        assertThat(summaries.getFirst().lastName()).isEqualTo("Lopez");
    }

    @Test
    void updateEntity_ignoresNulls_and_updatesActiveWhenPresent() {
        Doctor entity = new Doctor();
        entity.setLicenseNumber("LIC-LOCKED");
        entity.setFirstName("Inicial");
        entity.setLastName("Apellido");
        entity.setSpecialty("Clinica");
        entity.setPhone("111");
        entity.setEmail("old@x.com");
        entity.setActive(true);

        mapper.updateEntity(new DoctorUpdateRequest("Nuevo", null, null, "999", null, null), entity);

        assertThat(entity.getLicenseNumber()).isEqualTo("LIC-LOCKED");
        assertThat(entity.getFirstName()).isEqualTo("Nuevo");
        assertThat(entity.getLastName()).isEqualTo("Apellido");
        assertThat(entity.getPhone()).isEqualTo("999");
        assertThat(entity.isActive()).isTrue();

        mapper.updateEntity(new DoctorUpdateRequest(null, null, null, null, null, false), entity);

        assertThat(entity.isActive()).isFalse();
    }

    @Test
    void nullInputs_returnNull_or_noop() {
        Doctor entity = new Doctor();
        entity.setFirstName("Kept");

        assertThat(mapper.toEntity(null)).isNull();
        mapper.updateEntity(null, entity);
        assertThat(entity.getFirstName()).isEqualTo("Kept");

        assertThat(mapper.toResponse(null)).isNull();
        assertThat(mapper.toSummaryResponse(null)).isNull();
        assertThat(mapper.toResponseList(null)).isNull();
        assertThat(mapper.toSummaryResponseList(null)).isNull();
    }
}
