package com.fepdev.sfm.backend.domain.doctor;

import java.util.List;

import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

import com.fepdev.sfm.backend.domain.doctor.dto.DoctorCreateRequest;
import com.fepdev.sfm.backend.domain.doctor.dto.DoctorResponse;
import com.fepdev.sfm.backend.domain.doctor.dto.DoctorSummaryResponse;
import com.fepdev.sfm.backend.domain.doctor.dto.DoctorUpdateRequest;

@Mapper(componentModel = "spring")
public interface DoctorMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Doctor toEntity(DoctorCreateRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "licenseNumber", ignore = true)
    @Mapping(source = "isActive", target = "active")
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(DoctorUpdateRequest request, @MappingTarget Doctor entity);

    @Mapping(source = "active", target = "isActive")
    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "user.username", target = "username")
    DoctorResponse toResponse(Doctor entity);

    DoctorSummaryResponse toSummaryResponse(Doctor entity);

    List<DoctorResponse> toResponseList(List<Doctor> entities);

    List<DoctorSummaryResponse> toSummaryResponseList(List<Doctor> entities);
}
