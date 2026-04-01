package com.fepdev.sfm.backend.domain.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.domain.catalog.dto.ServiceCreateRequest;
import com.fepdev.sfm.backend.domain.catalog.dto.ServiceUpdateRequest;

class ServicesCatalogMapperImplTest {

    private final ServicesCatalogMapper mapper = new ServicesCatalogMapperImpl();

    @Test
    void toEntity_mapsCreateRequest() {
        ServiceCreateRequest request = new ServiceCreateRequest(
                "SRV-001", "Consulta", "General", new BigDecimal("45.00"), Category.CONSULTATION);

        ServicesCatalog entity = mapper.toEntity(request);

        assertThat(entity.getCode()).isEqualTo("SRV-001");
        assertThat(entity.getName()).isEqualTo("Consulta");
        assertThat(entity.getDescription()).isEqualTo("General");
        assertThat(entity.getPrice()).isEqualByComparingTo("45.00");
        assertThat(entity.getCategory()).isEqualTo(Category.CONSULTATION);
    }

    @Test
    void updateEntity_ignoresNullAndCode() {
        ServicesCatalog entity = new ServicesCatalog();
        entity.setCode("SRV-ORIG");
        entity.setName("Previo");
        entity.setDescription("desc");
        entity.setPrice(new BigDecimal("10.00"));
        entity.setCategory(Category.OTHER);
        entity.setIsActive(true);

        ServiceUpdateRequest request = new ServiceUpdateRequest("Nuevo", null, new BigDecimal("12.00"), Category.LABORATORY,
                false);
        mapper.updateEntity(request, entity);

        assertThat(entity.getCode()).isEqualTo("SRV-ORIG");
        assertThat(entity.getName()).isEqualTo("Nuevo");
        assertThat(entity.getDescription()).isEqualTo("desc");
        assertThat(entity.getPrice()).isEqualByComparingTo("12.00");
        assertThat(entity.getCategory()).isEqualTo(Category.LABORATORY);
        assertThat(entity.getIsActive()).isFalse();
    }

    @Test
    void toResponse_and_summaryList_mapFields() {
        UUID id = UUID.randomUUID();
        ServicesCatalog entity = new ServicesCatalog();
        ReflectionTestUtils.setField(entity, "id", id);
        entity.setCode("SRV-002");
        entity.setName("Rayos X");
        entity.setDescription("Simple");
        entity.setPrice(new BigDecimal("80.00"));
        entity.setCategory(Category.IMAGING);
        entity.setIsActive(true);

        var response = mapper.toResponse(entity);
        var summaries = mapper.toSummaryResponseList(List.of(entity));

        assertThat(response.id()).isEqualTo(id);
        assertThat(response.code()).isEqualTo("SRV-002");
        assertThat(response.category()).isEqualTo(Category.IMAGING);
        assertThat(summaries).hasSize(1);
        assertThat(summaries.getFirst().code()).isEqualTo("SRV-002");
    }
}
