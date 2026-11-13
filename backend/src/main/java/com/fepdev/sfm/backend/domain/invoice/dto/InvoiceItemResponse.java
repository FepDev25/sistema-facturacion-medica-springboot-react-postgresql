package com.fepdev.sfm.backend.domain.invoice.dto;

import com.fepdev.sfm.backend.domain.invoice.ItemType;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record InvoiceItemResponse(
        UUID id,
        UUID invoiceId,
        UUID serviceId,
        String serviceName,
        UUID medicationId,
        String medicationName,
        ItemType itemType,
        String description,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal subtotal,
        OffsetDateTime createdAt) {}
