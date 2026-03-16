package com.fepdev.sfm.backend.domain.insurance;

import java.util.List;

import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

import com.fepdev.sfm.backend.domain.insurance.dto.InsurancePolicyCreateRequest;
import com.fepdev.sfm.backend.domain.insurance.dto.InsurancePolicyResponse;
import com.fepdev.sfm.backend.domain.insurance.dto.InsurancePolicySummaryResponse;
import com.fepdev.sfm.backend.domain.insurance.dto.InsurancePolicyUpdateRequest;

@Mapper(componentModel = "spring")
public interface InsurancePolicyMapper {

    // patient y provider los resuelve el servicio por UUID; isActive se inicializa en true
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "patient", ignore = true)
    @Mapping(target = "provider", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    InsurancePolicy toEntity(InsurancePolicyCreateRequest request);

    // policyNumber, patient y provider son inmutables tras la creación
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "patient", ignore = true)
    @Mapping(target = "provider", ignore = true)
    @Mapping(target = "policyNumber", ignore = true)
    @Mapping(source = "isActive", target = "active")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(InsurancePolicyUpdateRequest request, @MappingTarget InsurancePolicy entity);

    @Mapping(source = "patient.id", target = "patientId")
    @Mapping(source = "patient.firstName", target = "patientFirstName")
    @Mapping(source = "patient.lastName", target = "patientLastName")
    @Mapping(source = "provider.id", target = "providerId")
    @Mapping(source = "provider.name", target = "providerName")
    @Mapping(source = "active", target = "isActive")
    InsurancePolicyResponse toResponse(InsurancePolicy entity);

    @Mapping(source = "provider.name", target = "providerName")
    @Mapping(source = "active", target = "isActive")
    InsurancePolicySummaryResponse toSummaryResponse(InsurancePolicy entity);

    List<InsurancePolicyResponse> toResponseList(List<InsurancePolicy> entities);

    List<InsurancePolicySummaryResponse> toSummaryResponseList(List<InsurancePolicy> entities);
}
