package com.fepdev.sfm.backend.domain.insurance;

import java.util.List;

import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

import com.fepdev.sfm.backend.domain.insurance.dto.InsuranceProviderCreateRequest;
import com.fepdev.sfm.backend.domain.insurance.dto.InsuranceProviderResponse;
import com.fepdev.sfm.backend.domain.insurance.dto.InsuranceProviderSummaryResponse;
import com.fepdev.sfm.backend.domain.insurance.dto.InsuranceProviderUpdateRequest;

@Mapper(componentModel = "spring")
public interface InsuranceProviderMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    InsuranceProvider toEntity(InsuranceProviderCreateRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "code", ignore = true)
    @Mapping(source = "isActive", target = "active")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(InsuranceProviderUpdateRequest request, @MappingTarget InsuranceProvider entity);

    @Mapping(source = "active", target = "isActive")
    InsuranceProviderResponse toResponse(InsuranceProvider entity);

    @Mapping(source = "active", target = "isActive")
    InsuranceProviderSummaryResponse toSummaryResponse(InsuranceProvider entity);

    List<InsuranceProviderResponse> toResponseList(List<InsuranceProvider> entities);

    List<InsuranceProviderSummaryResponse> toSummaryResponseList(List<InsuranceProvider> entities);
}
