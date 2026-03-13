package com.fepdev.sfm.backend.domain.patient;

import java.util.List;

import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

import com.fepdev.sfm.backend.domain.patient.dto.PatientCreateRequest;
import com.fepdev.sfm.backend.domain.patient.dto.PatientResponse;
import com.fepdev.sfm.backend.domain.patient.dto.PatientSummaryResponse;
import com.fepdev.sfm.backend.domain.patient.dto.PatientUpdateRequest;

@Mapper(componentModel = "spring")
public interface PatientMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "appointments", ignore = true)
    @Mapping(target = "insurancePolicies", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Patient toEntity(PatientCreateRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "dni", ignore = true)
    @Mapping(target = "appointments", ignore = true)
    @Mapping(target = "insurancePolicies", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(PatientUpdateRequest request, @MappingTarget Patient entity);

    PatientResponse toResponse(Patient entity);

    PatientSummaryResponse toSummaryResponse(Patient entity);

    List<PatientResponse> toResponseList(List<Patient> entities);

    List<PatientSummaryResponse> toSummaryResponseList(List<Patient> entities);
}
