package com.fepdev.sfm.backend.domain.insurance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record InsurancePolicyUpdateRequest(

    @NotNull(message = "El porcentaje de cobertura es obligatorio")
    @DecimalMin(value = "0.00", inclusive = true, message = "La cobertura mínima es 0%")
    @DecimalMax(value = "100.00", inclusive = true, message = "La cobertura máxima es 100%")
    BigDecimal coveragePercentage,

    @DecimalMin(value = "0.00", message = "El deducible no puede ser negativo")
    BigDecimal deductible,

    LocalDate startDate,

    LocalDate endDate,

    // null = no modificar; false = desactivar póliza
    Boolean isActive
) {}
