package com.fepdev.sfm.backend.domain.invoice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record InvoiceCreateRequest(
        @NotNull(message = "El ID del paciente es obligatorio")
        UUID patientId,

        // nullable: permite facturar sin cita (emergencias)
        UUID appointmentId,

        UUID insurancePolicyId,

        @NotNull(message = "Los ítems de la factura son obligatorios")
        @NotEmpty(message = "La factura debe tener al menos un ítem")
        @Valid
        List<InvoiceItemRequest> items,

        // obligatorio cuando appointmentId es null
        String notes) {}
