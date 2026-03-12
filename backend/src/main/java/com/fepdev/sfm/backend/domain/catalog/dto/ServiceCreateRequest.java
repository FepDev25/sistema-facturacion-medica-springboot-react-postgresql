package com.fepdev.sfm.backend.domain.catalog.dto;

import java.math.BigDecimal;

import com.fepdev.sfm.backend.domain.catalog.Category;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ServiceCreateRequest(

    @NotBlank(message = "El código del servicio es obligatorio")
    @Size(max = 50, message = "El código no puede exceder los 50 caracteres")
    String code,

    @NotBlank(message = "El nombre del servicio es obligatorio")
    @Size(max = 200, message = "El nombre no puede exceder los 200 caracteres")
    String name,

    String description,

    @NotNull(message = "El precio es obligatorio")
    @DecimalMin(value = "0.00", inclusive = false, message = "El precio debe ser mayor a cero")
    BigDecimal price,

    @NotNull(message = "La categoría es obligatoria")
    Category category
) {}
