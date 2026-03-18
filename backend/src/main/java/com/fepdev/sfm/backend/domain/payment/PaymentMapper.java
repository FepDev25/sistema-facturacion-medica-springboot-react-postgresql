package com.fepdev.sfm.backend.domain.payment;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.fepdev.sfm.backend.domain.payment.dto.PaymentCreateRequest;
import com.fepdev.sfm.backend.domain.payment.dto.PaymentResponse;

@Mapper(componentModel = "spring")
public interface PaymentMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "invoice", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    Payment toEntity(PaymentCreateRequest request);

    @Mapping(source = "invoice.id", target = "invoiceId")
    @Mapping(source = "invoice.invoiceNumber", target = "invoiceNumber")
    PaymentResponse toResponse(Payment entity);

    List<PaymentResponse> toResponseList(List<Payment> entities);
}
