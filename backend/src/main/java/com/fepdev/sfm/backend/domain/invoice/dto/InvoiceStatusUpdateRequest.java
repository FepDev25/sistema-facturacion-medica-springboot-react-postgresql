package com.fepdev.sfm.backend.domain.invoice.dto;

import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;

import jakarta.validation.constraints.NotNull;

public record InvoiceStatusUpdateRequest(

    @NotNull(message = "El estado es obligatorio")
    InvoiceStatus status
) {}
