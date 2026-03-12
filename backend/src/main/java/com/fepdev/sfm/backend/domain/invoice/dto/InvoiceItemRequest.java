package com.fepdev.sfm.backend.domain.invoice.dto;

import java.math.BigDecimal;
import java.util.UUID;

import com.fepdev.sfm.backend.domain.invoice.ItemType;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record InvoiceItemRequest(

    // uno de serviceId o medicationId debe estar presente; validado en el servicio
    UUID serviceId,

    UUID medicationId,

    @NotNull(message = "El tipo de ítem es obligatorio")
    ItemType itemType,

    @NotBlank(message = "La descripción del ítem es obligatoria")
    String description,

    @NotNull(message = "La cantidad es obligatoria")
    @Positive(message = "La cantidad debe ser un valor positivo")
    Integer quantity,

    @NotNull(message = "El precio unitario es obligatorio")
    @DecimalMin(value = "0.00", inclusive = false, message = "El precio unitario debe ser mayor a cero")
    BigDecimal unitPrice
) {}
