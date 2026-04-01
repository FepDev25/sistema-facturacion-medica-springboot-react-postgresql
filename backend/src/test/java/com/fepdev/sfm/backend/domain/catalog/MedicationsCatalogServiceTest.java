package com.fepdev.sfm.backend.domain.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.domain.catalog.dto.MedicationCreateRequest;
import com.fepdev.sfm.backend.domain.catalog.dto.MedicationResponse;
import com.fepdev.sfm.backend.domain.catalog.dto.MedicationSummaryResponse;
import com.fepdev.sfm.backend.domain.catalog.dto.MedicationUpdateRequest;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
class MedicationsCatalogServiceTest {

    @Mock
    MedicationsCatalogRepository repository;

    @Mock
    MedicationsCatalogMapper mapper;

    @Mock
    CatalogPriceHistoryRepository catalogPriceHistoryRepository;

    @InjectMocks
    MedicationsCatalogService medicationsCatalogService;

    @Test
    void createMedication_setsActiveAndReturnsResponse() {
        MedicationCreateRequest request = new MedicationCreateRequest(
                "MED-1", "Amoxicilina", "desc", new BigDecimal("12.50"), Unit.TABLET, true);
        MedicationsCatalog entity = new MedicationsCatalog();
        MedicationResponse response = new MedicationResponse(
                UUID.randomUUID(), "MED-1", "Amoxicilina", "desc", new BigDecimal("12.50"),
                Unit.TABLET, true, true, null, null);

        when(mapper.toEntity(request)).thenReturn(entity);
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toResponse(entity)).thenReturn(response);

        MedicationResponse result = medicationsCatalogService.createMedication(request);

        assertThat(result).isEqualTo(response);
        assertThat(entity.isActive()).isTrue();
    }

    @Test
    void updateMedication_whenNotFound_throwsEntityNotFoundException() {
        UUID id = UUID.randomUUID();
        MedicationUpdateRequest request = new MedicationUpdateRequest("Med", null, null, null, null, true);
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> medicationsCatalogService.updateMedication(id, request))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void updateMedication_whenPriceChanges_savesPriceHistory() {
        UUID id = UUID.randomUUID();
        MedicationUpdateRequest request = new MedicationUpdateRequest(
                "Amoxicilina", "desc", new BigDecimal("15.00"), Unit.TABLET, true, true);
        MedicationsCatalog entity = new MedicationsCatalog();
        ReflectionTestUtils.setField(entity, "id", id);
        entity.setCode("MED-1");
        entity.setName("Amoxicilina");
        entity.setPrice(new BigDecimal("12.50"));

        when(repository.findById(id)).thenReturn(Optional.of(entity));
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toResponse(entity)).thenReturn(new MedicationResponse(
                id, "MED-1", "Amoxicilina", "desc", new BigDecimal("15.00"),
                Unit.TABLET, true, true, null, null));

        medicationsCatalogService.updateMedication(id, request);

        verify(catalogPriceHistoryRepository).save(org.mockito.ArgumentMatchers.any(CatalogPriceHistory.class));
        verify(mapper).updateEntity(request, entity);
    }

    @Test
    void deactivateMedication_setsInactive() {
        UUID id = UUID.randomUUID();
        MedicationsCatalog entity = new MedicationsCatalog();
        entity.setActive(true);
        when(repository.findById(id)).thenReturn(Optional.of(entity));
        when(repository.save(entity)).thenReturn(entity);

        medicationsCatalogService.deactivateMedication(id);

        assertThat(entity.isActive()).isFalse();
    }

    @Test
    void getMedicationById_whenFound_returnsResponse() {
        UUID id = UUID.randomUUID();
        MedicationsCatalog entity = new MedicationsCatalog();
        MedicationResponse response = new MedicationResponse(
                id, "MED-1", "Amoxicilina", null, new BigDecimal("12.50"),
                Unit.TABLET, true, true, null, null);
        when(repository.findById(id)).thenReturn(Optional.of(entity));
        when(mapper.toResponse(entity)).thenReturn(response);

        MedicationResponse result = medicationsCatalogService.getMedicationById(id);

        assertThat(result).isEqualTo(response);
    }

    @Test
    void getMedicationByCode_whenFound_returnsResponse() {
        MedicationsCatalog entity = new MedicationsCatalog();
        MedicationResponse response = new MedicationResponse(
                UUID.randomUUID(), "MED-1", "Amoxicilina", null, new BigDecimal("12.50"),
                Unit.TABLET, true, true, null, null);
        when(repository.findByCode("MED-1")).thenReturn(Optional.of(entity));
        when(mapper.toResponse(entity)).thenReturn(response);

        MedicationResponse result = medicationsCatalogService.getMedicationByCode("MED-1");

        assertThat(result.code()).isEqualTo("MED-1");
    }

    @Test
    void searchMedications_whenNameTooShort_throwsBusinessRuleException() {
        assertThatThrownBy(() -> medicationsCatalogService.searchMedications(true, Unit.TABLET, true, "a", Pageable.unpaged()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("al menos 2 caracteres");
    }

    @Test
    void searchMedications_whenFiltersValid_returnsMappedPage() {
        MedicationsCatalog entity = new MedicationsCatalog();
        MedicationSummaryResponse summary = new MedicationSummaryResponse(
                UUID.randomUUID(), "MED-1", "Amoxicilina", new BigDecimal("12.50"), Unit.TABLET);
        Pageable pageable = Pageable.ofSize(10);

        when(repository.search(true, Unit.TABLET, true, "amo", pageable))
                .thenReturn(new PageImpl<>(java.util.List.of(entity), pageable, 1));
        when(mapper.toSummaryResponse(entity)).thenReturn(summary);

        var page = medicationsCatalogService.searchMedications(true, Unit.TABLET, true, "amo", pageable);

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().getFirst().code()).isEqualTo("MED-1");
    }
}
