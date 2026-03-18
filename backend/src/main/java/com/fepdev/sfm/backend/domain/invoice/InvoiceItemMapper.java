package com.fepdev.sfm.backend.domain.invoice;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemRequest;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemResponse;

@Mapper(componentModel = "spring")
public interface InvoiceItemMapper {

    // service, medication, invoice y subtotal los resuelve el servicio
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "invoice", ignore = true)
    @Mapping(target = "service", ignore = true)
    @Mapping(target = "medication", ignore = true)
    @Mapping(target = "subtotal", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    InvoiceItem toEntity(InvoiceItemRequest request);

    @Mapping(source = "invoice.id", target = "invoiceId")
    @Mapping(source = "service.id", target = "serviceId")
    @Mapping(source = "service.name", target = "serviceName")
    @Mapping(source = "medication.id", target = "medicationId")
    @Mapping(source = "medication.name", target = "medicationName")
    InvoiceItemResponse toResponse(InvoiceItem entity);

    List<InvoiceItemResponse> toResponseList(List<InvoiceItem> entities);
}
