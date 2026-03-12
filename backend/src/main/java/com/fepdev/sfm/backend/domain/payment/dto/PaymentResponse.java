package com.fepdev.sfm.backend.domain.payment.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.fepdev.sfm.backend.domain.payment.PaymentMethod;

public record PaymentResponse(
    UUID id,
    UUID invoiceId,
    String invoiceNumber,
    BigDecimal amount,
    PaymentMethod paymentMethod,
    String referenceNumber,
    String notes,
    OffsetDateTime paymentDate,
    OffsetDateTime createdAt
) {}
