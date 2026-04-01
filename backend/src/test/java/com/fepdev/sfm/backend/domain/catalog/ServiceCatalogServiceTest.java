package com.fepdev.sfm.backend.domain.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
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

import com.fepdev.sfm.backend.domain.catalog.dto.ServiceCreateRequest;
import com.fepdev.sfm.backend.domain.catalog.dto.ServiceResponse;
import com.fepdev.sfm.backend.domain.catalog.dto.ServiceSummaryResponse;
import com.fepdev.sfm.backend.domain.catalog.dto.ServiceUpdateRequest;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
class ServiceCatalogServiceTest {

    @Mock
    ServicesCatalogRepository servicesCatalogRepository;

    @Mock
    ServicesCatalogMapper servicesCatalogMapper;

    @Mock
    CatalogPriceHistoryRepository catalogPriceHistoryRepository;

    @InjectMocks
    ServiceCatalogService serviceCatalogService;

    @Test
    void createServicesCatalog_setsActiveAndReturnsResponse() {
        ServiceCreateRequest request = new ServiceCreateRequest(
                "SRV-1", "Consulta", "desc", new BigDecimal("50.00"), Category.CONSULTATION);
        ServicesCatalog entity = new ServicesCatalog();
        ServiceResponse response = new ServiceResponse(
                UUID.randomUUID(), "SRV-1", "Consulta", "desc", new BigDecimal("50.00"),
                Category.CONSULTATION, true, null, null);

        when(servicesCatalogMapper.toEntity(request)).thenReturn(entity);
        when(servicesCatalogRepository.save(entity)).thenReturn(entity);
        when(servicesCatalogMapper.toResponse(entity)).thenReturn(response);

        ServiceResponse result = serviceCatalogService.createServicesCatalog(request);

        assertThat(result).isEqualTo(response);
        assertThat(entity.getIsActive()).isTrue();
    }

    @Test
    void updateServiceCatalog_whenNotFound_throwsEntityNotFoundException() {
        UUID id = UUID.randomUUID();
        ServiceUpdateRequest request = new ServiceUpdateRequest("Nuevo", null, null, null, true);
        when(servicesCatalogRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> serviceCatalogService.updateServiceCatalog(id, request))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void updateServiceCatalog_whenPriceChanges_savesPriceHistory() {
        UUID id = UUID.randomUUID();
        ServiceUpdateRequest request = new ServiceUpdateRequest(
                "Consulta", "desc", new BigDecimal("80.00"), Category.CONSULTATION, true);
        ServicesCatalog entity = new ServicesCatalog();
        ReflectionTestUtils.setField(entity, "id", id);
        entity.setCode("SRV-1");
        entity.setName("Consulta");
        entity.setPrice(new BigDecimal("50.00"));
        ServiceResponse response = new ServiceResponse(
                id, "SRV-1", "Consulta", "desc", new BigDecimal("80.00"),
                Category.CONSULTATION, true, null, null);

        when(servicesCatalogRepository.findById(id)).thenReturn(Optional.of(entity));
        when(servicesCatalogRepository.save(entity)).thenReturn(entity);
        when(servicesCatalogMapper.toResponse(entity)).thenReturn(response);

        ServiceResponse result = serviceCatalogService.updateServiceCatalog(id, request);

        assertThat(result).isEqualTo(response);
        verify(catalogPriceHistoryRepository).save(org.mockito.ArgumentMatchers.any(CatalogPriceHistory.class));
        verify(servicesCatalogMapper).updateEntity(request, entity);
    }

    @Test
    void updateServiceCatalog_whenPriceUnchanged_doesNotSavePriceHistory() {
        UUID id = UUID.randomUUID();
        ServiceUpdateRequest request = new ServiceUpdateRequest(
                "Consulta", "desc", new BigDecimal("50.00"), Category.CONSULTATION, true);
        ServicesCatalog entity = new ServicesCatalog();
        entity.setPrice(new BigDecimal("50.00"));
        when(servicesCatalogRepository.findById(id)).thenReturn(Optional.of(entity));
        when(servicesCatalogRepository.save(entity)).thenReturn(entity);
        when(servicesCatalogMapper.toResponse(entity)).thenReturn(new ServiceResponse(
                id, "SRV-1", "Consulta", "desc", new BigDecimal("50.00"),
                Category.CONSULTATION, true, null, null));

        serviceCatalogService.updateServiceCatalog(id, request);

        org.mockito.Mockito.verify(catalogPriceHistoryRepository, org.mockito.Mockito.never())
                .save(org.mockito.ArgumentMatchers.any(CatalogPriceHistory.class));
    }

    @Test
    void deactivateServiceCatalog_setsEntityInactive() {
        UUID id = UUID.randomUUID();
        ServicesCatalog entity = new ServicesCatalog();
        entity.setIsActive(true);
        when(servicesCatalogRepository.findById(id)).thenReturn(Optional.of(entity));
        when(servicesCatalogRepository.save(entity)).thenReturn(entity);

        serviceCatalogService.deactivateServiceCatalog(id);

        assertThat(entity.getIsActive()).isFalse();
        verify(servicesCatalogRepository).save(entity);
    }

    @Test
    void getServiceCatalogById_whenFound_returnsResponse() {
        UUID id = UUID.randomUUID();
        ServicesCatalog entity = new ServicesCatalog();
        ServiceResponse response = new ServiceResponse(
                id, "SRV-1", "Consulta", null, new BigDecimal("50.00"),
                Category.CONSULTATION, true, null, null);
        when(servicesCatalogRepository.findById(id)).thenReturn(Optional.of(entity));
        when(servicesCatalogMapper.toResponse(entity)).thenReturn(response);

        ServiceResponse result = serviceCatalogService.getServiceCatalogById(id);

        assertThat(result).isEqualTo(response);
    }

    @Test
    void searchServicesByName_whenTermTooShort_throwsBusinessRuleException() {
        assertThatThrownBy(() -> serviceCatalogService.searchServicesByName("a"))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("al menos 2 caracteres");
    }

    @Test
    void searchServicesByName_whenValid_returnsSummaries() {
        ServicesCatalog entity = new ServicesCatalog();
        ServiceSummaryResponse summary = new ServiceSummaryResponse(
                UUID.randomUUID(), "SRV-1", "Consulta", new BigDecimal("50.00"), Category.CONSULTATION, true);
        when(servicesCatalogRepository.findByNameContainingIgnoreCase("cons"))
                .thenReturn(List.of(entity));
        when(servicesCatalogMapper.toSummaryResponseList(List.of(entity))).thenReturn(List.of(summary));

        List<ServiceSummaryResponse> result = serviceCatalogService.searchServicesByName("cons");

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().code()).isEqualTo("SRV-1");
    }

    @Test
    void getServiceCatalogs_returnsMappedPage() {
        Pageable pageable = Pageable.ofSize(10);
        ServicesCatalog entity = new ServicesCatalog();
        ServiceSummaryResponse summary = new ServiceSummaryResponse(
                UUID.randomUUID(), "SRV-1", "Consulta", new BigDecimal("50.00"), Category.CONSULTATION, true);

        when(servicesCatalogRepository.findWithFilters(Category.CONSULTATION, true, pageable))
                .thenReturn(new PageImpl<>(List.of(entity), pageable, 1));
        when(servicesCatalogMapper.toSummaryResponse(entity)).thenReturn(summary);

        var page = serviceCatalogService.getServiceCatalogs(Category.CONSULTATION, true, pageable);

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().getFirst().name()).isEqualTo("Consulta");
    }
}
