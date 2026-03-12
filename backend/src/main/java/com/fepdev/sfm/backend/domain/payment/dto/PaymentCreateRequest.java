package com.fepdev.sfm.backend.domain.payment.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.fepdev.sfm.backend.domain.payment.PaymentMethod;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PaymentCreateRequest(

    @NotNull(message = "El ID de la factura es obligatorio")
    UUID invoiceId,

    @NotNull(message = "El monto es obligatorio")
    @DecimalMin(value = "0.00", inclusive = false, message = "El monto debe ser mayor a cero")
    BigDecimal amount,

    @NotNull(message = "El método de pago es obligatorio")
    PaymentMethod paymentMethod,

    @Size(max = 100, message = "El número de referencia no puede exceder los 100 caracteres")
    String referenceNumber,

    String notes,

    @NotNull(message = "La fecha del pago es obligatoria")
    OffsetDateTime paymentDate
) {}
