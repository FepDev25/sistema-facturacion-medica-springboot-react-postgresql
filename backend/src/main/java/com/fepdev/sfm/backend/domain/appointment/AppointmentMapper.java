package com.fepdev.sfm.backend.domain.appointment;

import java.util.List;

import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentCreateRequest;
import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentResponse;
import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentSummaryResponse;
import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentUpdateRequest;

@Mapper(componentModel = "spring")
public interface AppointmentMapper {

    // patient, doctor los resuelve el servicio; scheduledEndAt y status los calcula el servicio
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "patient", ignore = true)
    @Mapping(target = "doctor", ignore = true)
    @Mapping(target = "scheduledEndAt", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Appointment toEntity(AppointmentCreateRequest request);

    // scheduledEndAt lo recalcula el servicio tras actualizar
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "patient", ignore = true)
    @Mapping(target = "doctor", ignore = true)
    @Mapping(target = "scheduledEndAt", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(AppointmentUpdateRequest request, @MappingTarget Appointment entity);

    @Mapping(source = "patient.id", target = "patientId")
    @Mapping(source = "patient.firstName", target = "patientFirstName")
    @Mapping(source = "patient.lastName", target = "patientLastName")
    @Mapping(source = "doctor.id", target = "doctorId")
    @Mapping(source = "doctor.firstName", target = "doctorFirstName")
    @Mapping(source = "doctor.lastName", target = "doctorLastName")
    AppointmentResponse toResponse(Appointment entity);

    @Mapping(source = "patient.firstName", target = "patientFirstName")
    @Mapping(source = "patient.lastName", target = "patientLastName")
    @Mapping(source = "doctor.firstName", target = "doctorFirstName")
    @Mapping(source = "doctor.lastName", target = "doctorLastName")
    AppointmentSummaryResponse toSummaryResponse(Appointment entity);

    List<AppointmentResponse> toResponseList(List<Appointment> entities);

    List<AppointmentSummaryResponse> toSummaryResponseList(List<Appointment> entities);
}
