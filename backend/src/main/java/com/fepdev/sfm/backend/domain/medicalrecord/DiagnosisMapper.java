package com.fepdev.sfm.backend.domain.medicalrecord;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.fepdev.sfm.backend.domain.medicalrecord.dto.DiagnosisCreateRequest;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.DiagnosisResponse;

@Mapper(componentModel = "spring")
public interface DiagnosisMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "appointment", ignore = true)
    @Mapping(target = "medicalRecord", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    Diagnosis toEntity(DiagnosisCreateRequest request);

    @Mapping(source = "appointment.id", target = "appointmentId")
    @Mapping(source = "medicalRecord.id", target = "medicalRecordId")
    DiagnosisResponse toResponse(Diagnosis entity);

    List<DiagnosisResponse> toResponseList(List<Diagnosis> entities);
}
