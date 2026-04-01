package com.fepdev.sfm.backend.domain.insurance;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.domain.insurance.dto.InsuranceProviderCreateRequest;
import com.fepdev.sfm.backend.domain.insurance.dto.InsuranceProviderUpdateRequest;

class InsuranceProviderMapperImplTest {

    private final InsuranceProviderMapper mapper = new InsuranceProviderMapperImpl();

    @Test
    void toEntity_and_update_and_lists_mapFields() {
        InsuranceProviderCreateRequest create = new InsuranceProviderCreateRequest(
                "Seguro Uno", "SEG-1", "555", "a@b.com", "Calle 1");
        InsuranceProvider entity = mapper.toEntity(create);

        assertThat(entity.getName()).isEqualTo("Seguro Uno");
        assertThat(entity.getCode()).isEqualTo("SEG-1");

        entity.setCode("LOCKED");
        mapper.updateEntity(new InsuranceProviderUpdateRequest("Nuevo", null, null, "Dir", false), entity);
        assertThat(entity.getCode()).isEqualTo("LOCKED");
        assertThat(entity.getName()).isEqualTo("Nuevo");
        assertThat(entity.getAddress()).isEqualTo("Dir");
        assertThat(entity.isActive()).isFalse();

        ReflectionTestUtils.setField(entity, "id", UUID.randomUUID());
        var response = mapper.toResponse(entity);
        var summaries = mapper.toSummaryResponseList(List.of(entity));

        assertThat(response.id()).isNotNull();
        assertThat(response.isActive()).isFalse();
        assertThat(summaries).hasSize(1);
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
