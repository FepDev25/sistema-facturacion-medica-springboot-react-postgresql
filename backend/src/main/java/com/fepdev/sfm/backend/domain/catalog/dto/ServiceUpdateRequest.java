package com.fepdev.sfm.backend.domain.catalog.dto;

import java.math.BigDecimal;

import com.fepdev.sfm.backend.domain.catalog.Category;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ServiceUpdateRequest(

    @Size(max = 200, message = "El nombre no puede exceder los 200 caracteres")
    String name,

    String description,

    @DecimalMin(value = "0.00", inclusive = false, message = "El precio debe ser mayor a cero")
    BigDecimal price,

    Category category,

    @NotNull(message = "El estado activo es obligatorio")
    Boolean isActive
) {}
