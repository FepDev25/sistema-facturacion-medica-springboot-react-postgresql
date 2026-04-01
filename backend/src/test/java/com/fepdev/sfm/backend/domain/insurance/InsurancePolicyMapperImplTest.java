package com.fepdev.sfm.backend.domain.insurance;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.domain.insurance.dto.InsurancePolicyCreateRequest;
import com.fepdev.sfm.backend.domain.insurance.dto.InsurancePolicyUpdateRequest;
import com.fepdev.sfm.backend.domain.patient.Patient;

class InsurancePolicyMapperImplTest {

    private final InsurancePolicyMapper mapper = new InsurancePolicyMapperImpl();

    @Test
    void toEntity_and_update_and_toResponseList_mapFields() {
        InsurancePolicyCreateRequest create = new InsurancePolicyCreateRequest(
                UUID.randomUUID(), UUID.randomUUID(), "POL-1",
                new BigDecimal("80.00"), new BigDecimal("0.00"),
                LocalDate.now(), LocalDate.now().plusDays(30));

        InsurancePolicy entity = mapper.toEntity(create);
        assertThat(entity.getPolicyNumber()).isEqualTo("POL-1");
        assertThat(entity.getCoveragePercentage()).isEqualByComparingTo("80.00");

        entity.setPolicyNumber("LOCKED");
        mapper.updateEntity(new InsurancePolicyUpdateRequest(new BigDecimal("60.00"), null, null, null, false), entity);
        assertThat(entity.getPolicyNumber()).isEqualTo("LOCKED");
        assertThat(entity.getCoveragePercentage()).isEqualByComparingTo("60.00");
        assertThat(entity.isActive()).isFalse();

        Patient patient = new Patient();
        ReflectionTestUtils.setField(patient, "id", UUID.randomUUID());
        patient.setFirstName("Ana");
        patient.setLastName("Lopez");
        InsuranceProvider provider = new InsuranceProvider();
        ReflectionTestUtils.setField(provider, "id", UUID.randomUUID());
        provider.setName("Seguro Uno");
        entity.setPatient(patient);
        entity.setProvider(provider);
        ReflectionTestUtils.setField(entity, "id", UUID.randomUUID());

        var response = mapper.toResponse(entity);
        var summaries = mapper.toSummaryResponseList(List.of(entity));

        assertThat(response.patientFirstName()).isEqualTo("Ana");
        assertThat(response.providerName()).isEqualTo("Seguro Uno");
        assertThat(summaries).hasSize(1);
        assertThat(summaries.getFirst().providerName()).isEqualTo("Seguro Uno");
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
