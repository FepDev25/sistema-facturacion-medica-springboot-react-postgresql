package com.fepdev.sfm.backend.domain.patient;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.domain.patient.dto.PatientCreateRequest;
import com.fepdev.sfm.backend.domain.patient.dto.PatientUpdateRequest;

class PatientMapperImplTest {

    private final PatientMapper mapper = new PatientMapperImpl();

    @Test
    void toEntity_update_toResponse_and_summaryList_mapFields() {
        PatientCreateRequest create = new PatientCreateRequest(
                "12345678", "Ana", "Lopez", LocalDate.of(1990, 1, 1), Gender.FEMALE,
                "555", "ana@x.com", "Dir", "O+", "none");
        Patient entity = mapper.toEntity(create);
        assertThat(entity.getDni()).isEqualTo("12345678");
        assertThat(entity.getFirstName()).isEqualTo("Ana");

        entity.setDni("LOCKED");
        mapper.updateEntity(new PatientUpdateRequest("A", null, null, null, "999", null, null, null, null), entity);
        assertThat(entity.getDni()).isEqualTo("LOCKED");
        assertThat(entity.getFirstName()).isEqualTo("A");
        assertThat(entity.getPhone()).isEqualTo("999");

        ReflectionTestUtils.setField(entity, "id", UUID.randomUUID());
        var response = mapper.toResponse(entity);
        var summaries = mapper.toSummaryResponseList(List.of(entity));
        assertThat(response.id()).isNotNull();
        assertThat(summaries).hasSize(1);
        assertThat(summaries.getFirst().dni()).isEqualTo("LOCKED");
    }

    @Test
    void nullInputs_returnNull() {
        assertThat(mapper.toEntity(null)).isNull();
        assertThat(mapper.toResponse(null)).isNull();
        assertThat(mapper.toSummaryResponse(null)).isNull();
        assertThat(mapper.toResponseList(null)).isNull();
        assertThat(mapper.toSummaryResponseList(null)).isNull();
    }
}
