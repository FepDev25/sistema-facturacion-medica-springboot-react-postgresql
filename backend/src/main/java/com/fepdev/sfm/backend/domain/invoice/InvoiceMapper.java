package com.fepdev.sfm.backend.domain.invoice;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceResponse;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceSummaryResponse;

@Mapper(componentModel = "spring")
public interface InvoiceMapper {

    // Invoice no tiene un CreateRequest directo útil para mapear: el servicio construye
    // la entidad manualmente (calcula totales, asigna número, resuelve FKs).

    // items no existe en la entidad (sin bidireccional): el servicio los carga y los mapea
    @Mapping(source = "patient.id", target = "patientId")
    @Mapping(source = "patient.firstName", target = "patientFirstName")
    @Mapping(source = "patient.lastName", target = "patientLastName")
    @Mapping(source = "appointment.id", target = "appointmentId")
    @Mapping(source = "insurancePolicy.id", target = "insurancePolicyId")
    @Mapping(target = "items", ignore = true)
    InvoiceResponse toResponse(Invoice entity);

    @Mapping(source = "patient.id", target = "patientId")
    @Mapping(source = "patient.firstName", target = "patientFirstName")
    @Mapping(source = "patient.lastName", target = "patientLastName")
    InvoiceSummaryResponse toSummaryResponse(Invoice entity);

    List<InvoiceSummaryResponse> toSummaryResponseList(List<Invoice> entities);
}
