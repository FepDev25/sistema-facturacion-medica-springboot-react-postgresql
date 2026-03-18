package com.fepdev.sfm.backend.domain.medicalrecord;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.fepdev.sfm.backend.domain.medicalrecord.dto.ProcedureCreateRequest;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.ProcedureResponse;

@Mapper(componentModel = "spring")
public interface ProcedureMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "appointment", ignore = true)
    @Mapping(target = "medicalRecord", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    Procedure toEntity(ProcedureCreateRequest request);

    @Mapping(source = "appointment.id", target = "appointmentId")
    @Mapping(source = "medicalRecord.id", target = "medicalRecordId")
    ProcedureResponse toResponse(Procedure entity);

    List<ProcedureResponse> toResponseList(List<Procedure> entities);
}
