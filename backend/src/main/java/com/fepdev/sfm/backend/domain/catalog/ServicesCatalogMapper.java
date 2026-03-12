package com.fepdev.sfm.backend.domain.catalog;

import java.util.List;

import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

import com.fepdev.sfm.backend.domain.catalog.dto.ServiceCreateRequest;
import com.fepdev.sfm.backend.domain.catalog.dto.ServiceResponse;
import com.fepdev.sfm.backend.domain.catalog.dto.ServiceSummaryResponse;
import com.fepdev.sfm.backend.domain.catalog.dto.ServiceUpdateRequest;

@Mapper(componentModel = "spring")
public interface ServicesCatalogMapper {

    // ServiceCreateRequest -> ServicesCatalog
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "isActive", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    ServicesCatalog toEntity(ServiceCreateRequest request);

    // Actualización parcial: los campos null en el request no sobreescriben la entidad
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "code", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(ServiceUpdateRequest request, @MappingTarget ServicesCatalog entity);

    // ServicesCatalog -> ServiceResponse (respuesta completa)
    ServiceResponse toResponse(ServicesCatalog entity);

    // ServicesCatalog -> ServiceSummaryResponse (listados)
    ServiceSummaryResponse toSummaryResponse(ServicesCatalog entity);

    List<ServiceResponse> toResponseList(List<ServicesCatalog> entities);

    List<ServiceSummaryResponse> toSummaryResponseList(List<ServicesCatalog> entities);
}
