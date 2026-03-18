package com.fepdev.sfm.backend.domain.invoice.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;

public record InvoiceSummaryResponse(
    UUID id,
    String invoiceNumber,
    UUID patientId,
    String patientFirstName,
    String patientLastName,
    BigDecimal total,
    InvoiceStatus status,
    LocalDate issueDate,
    LocalDate dueDate
) {}
