package com.fepdev.sfm.backend.domain.invoice.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.fepdev.sfm.backend.domain.invoice.Status;

public record InvoiceResponse(
    UUID id,
    UUID patientId,
    String patientFirstName,
    String patientLastName,
    UUID appointmentId,
    UUID insurancePolicyId,
    String invoiceNumber,
    BigDecimal subtotal,
    BigDecimal tax,
    BigDecimal total,
    BigDecimal insuranceCoverage,
    BigDecimal patientResponsibility,
    Status status,
    LocalDate issueDate,
    LocalDate dueDate,
    String notes,
    List<InvoiceItemResponse> items,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
