package com.fepdev.sfm.backend.domain.medicalrecord;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.fepdev.sfm.backend.domain.medicalrecord.dto.PrescriptionCreateRequest;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.PrescriptionResponse;

@Mapper(componentModel = "spring")
public interface PrescriptionMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "appointment", ignore = true)
    @Mapping(target = "medicalRecord", ignore = true)
    @Mapping(target = "medication", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    Prescription toEntity(PrescriptionCreateRequest request);

    @Mapping(source = "appointment.id", target = "appointmentId")
    @Mapping(source = "medicalRecord.id", target = "medicalRecordId")
    @Mapping(source = "medication.id", target = "medicationId")
    @Mapping(source = "medication.name", target = "medicationName")
    PrescriptionResponse toResponse(Prescription entity);

    List<PrescriptionResponse> toResponseList(List<Prescription> entities);
}
