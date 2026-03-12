package com.fepdev.sfm.backend.domain.insurance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InsurancePolicyCreateRequest(

    @NotNull(message = "El ID del paciente es obligatorio")
    UUID patientId,

    @NotNull(message = "El ID del proveedor es obligatorio")
    UUID providerId,

    @NotBlank(message = "El número de póliza es obligatorio")
    @Size(max = 100, message = "El número de póliza no puede exceder los 100 caracteres")
    String policyNumber,

    @NotNull(message = "El porcentaje de cobertura es obligatorio")
    @DecimalMin(value = "0.00", message = "El porcentaje de cobertura no puede ser negativo")
    @DecimalMax(value = "100.00", message = "El porcentaje de cobertura no puede exceder el 100%")
    BigDecimal coveragePercentage,

    @NotNull(message = "El deducible es obligatorio")
    @DecimalMin(value = "0.00", message = "El deducible no puede ser negativo")
    BigDecimal deductible,

    @NotNull(message = "La fecha de inicio es obligatoria")
    LocalDate startDate,

    @NotNull(message = "La fecha de fin es obligatoria")
    LocalDate endDate
) {}
