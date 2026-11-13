package com.fepdev.sfm.backend.domain.invoice.dto;

import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record InvoiceSummaryResponse(
        UUID id,
        String invoiceNumber,
        UUID patientId,
        String patientFirstName,
        String patientLastName,
        BigDecimal total,
        InvoiceStatus status,
        LocalDate issueDate,
        LocalDate dueDate) {}
