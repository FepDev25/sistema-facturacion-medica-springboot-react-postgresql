package com.fepdev.sfm.backend.domain.invoice.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;

public record InvoiceListViewResponse(
    UUID id,
    UUID patientId,
    String patientFirstName,
    String patientLastName,
    String invoiceNumber,
    BigDecimal total,
    BigDecimal patientResponsibility,
    InvoiceStatus status,
    LocalDate issueDate,
    LocalDate dueDate,
    OffsetDateTime createdAt
) {}
