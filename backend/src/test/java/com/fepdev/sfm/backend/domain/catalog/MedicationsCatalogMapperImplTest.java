package com.fepdev.sfm.backend.domain.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.domain.catalog.dto.MedicationCreateRequest;
import com.fepdev.sfm.backend.domain.catalog.dto.MedicationUpdateRequest;

class MedicationsCatalogMapperImplTest {

    private final MedicationsCatalogMapper mapper = new MedicationsCatalogMapperImpl();

    @Test
    void toEntity_mapsCreateRequest() {
        MedicationCreateRequest request = new MedicationCreateRequest(
                "MED-001", "Amoxicilina", "Capsulas", new BigDecimal("12.50"), Unit.CAPSULE, true);

        MedicationsCatalog entity = mapper.toEntity(request);

        assertThat(entity.getCode()).isEqualTo("MED-001");
        assertThat(entity.getName()).isEqualTo("Amoxicilina");
        assertThat(entity.getDescription()).isEqualTo("Capsulas");
        assertThat(entity.getPrice()).isEqualByComparingTo("12.50");
        assertThat(entity.getUnit()).isEqualTo(Unit.CAPSULE);
        assertThat(entity.isRequiresPrescription()).isTrue();
    }

    @Test
    void updateEntity_mapsActiveAndIgnoresNull() {
        MedicationsCatalog entity = new MedicationsCatalog();
        entity.setCode("MED-ORIG");
        entity.setName("Previo");
        entity.setDescription("desc");
        entity.setPrice(new BigDecimal("10.00"));
        entity.setUnit(Unit.TABLET);
        entity.setRequiresPrescription(true);
        entity.setActive(true);

        MedicationUpdateRequest request = new MedicationUpdateRequest("Nuevo", null, new BigDecimal("11.00"), Unit.MG, false,
                false);
        mapper.updateEntity(request, entity);

        assertThat(entity.getCode()).isEqualTo("MED-ORIG");
        assertThat(entity.getName()).isEqualTo("Nuevo");
        assertThat(entity.getDescription()).isEqualTo("desc");
        assertThat(entity.getPrice()).isEqualByComparingTo("11.00");
        assertThat(entity.getUnit()).isEqualTo(Unit.MG);
        assertThat(entity.isRequiresPrescription()).isFalse();
        assertThat(entity.isActive()).isFalse();
    }

    @Test
    void toResponse_and_summaryList_mapFields() {
        UUID id = UUID.randomUUID();
        MedicationsCatalog entity = new MedicationsCatalog();
        ReflectionTestUtils.setField(entity, "id", id);
        entity.setCode("MED-002");
        entity.setName("Ibuprofeno");
        entity.setDescription("400mg");
        entity.setPrice(new BigDecimal("8.20"));
        entity.setUnit(Unit.TABLET);
        entity.setRequiresPrescription(false);
        entity.setActive(true);

        var response = mapper.toResponse(entity);
        var summaries = mapper.toSummaryResponseList(List.of(entity));

        assertThat(response.id()).isEqualTo(id);
        assertThat(response.code()).isEqualTo("MED-002");
        assertThat(response.isActive()).isTrue();
        assertThat(summaries).hasSize(1);
        assertThat(summaries.getFirst().code()).isEqualTo("MED-002");
    }
}
