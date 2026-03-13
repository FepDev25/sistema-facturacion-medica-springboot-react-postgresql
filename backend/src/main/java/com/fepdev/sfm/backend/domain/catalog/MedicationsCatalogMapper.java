package com.fepdev.sfm.backend.domain.catalog;

import java.util.List;

import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

import com.fepdev.sfm.backend.domain.catalog.dto.MedicationCreateRequest;
import com.fepdev.sfm.backend.domain.catalog.dto.MedicationResponse;
import com.fepdev.sfm.backend.domain.catalog.dto.MedicationSummaryResponse;
import com.fepdev.sfm.backend.domain.catalog.dto.MedicationUpdateRequest;

@Mapper(componentModel = "spring")
public interface MedicationsCatalogMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    MedicationsCatalog toEntity(MedicationCreateRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "code", ignore = true)
    @Mapping(source = "isActive", target = "active")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(MedicationUpdateRequest request, @MappingTarget MedicationsCatalog entity);

    @Mapping(source = "active", target = "isActive")
    MedicationResponse toResponse(MedicationsCatalog entity);

    MedicationSummaryResponse toSummaryResponse(MedicationsCatalog entity);

    List<MedicationResponse> toResponseList(List<MedicationsCatalog> entities);

    List<MedicationSummaryResponse> toSummaryResponseList(List<MedicationsCatalog> entities);
}
