package com.fepdev.sfm.backend.domain.invoice.dto;

import com.fepdev.sfm.backend.domain.invoice.ItemType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;

public record InvoiceItemRequest(

        // uno de serviceId o medicationId debe estar presente; validado en el servicio
        UUID serviceId,

        UUID medicationId,

        @NotNull(message = "El tipo de ítem es obligatorio") ItemType itemType,

        // Para SERVICE/MEDICATION la descripción y el precio salen del catálogo; solo
        // ADMIN puede enviar un override. Para PROCEDURE/OTHER son obligatorios.
        @Size(max = 255, message = "La descripción no puede exceder los 255 caracteres")
        String description,

        @NotNull(message = "La cantidad es obligatoria") @Positive(message = "La cantidad debe ser un valor positivo")
        Integer quantity,

        BigDecimal unitPrice) {}
