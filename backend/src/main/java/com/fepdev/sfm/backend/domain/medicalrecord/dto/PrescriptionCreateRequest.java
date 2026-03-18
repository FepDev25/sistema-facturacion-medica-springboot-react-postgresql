package com.fepdev.sfm.backend.domain.medicalrecord.dto;

import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PrescriptionCreateRequest(

    @NotNull(message = "El ID de la cita es obligatorio")
    UUID appointmentId,

    @NotNull(message = "El ID del registro médico es obligatorio")
    UUID medicalRecordId,

    @NotNull(message = "El ID del medicamento es obligatorio")
    UUID medicationId,

    @NotBlank(message = "La dosis es obligatoria")
    String dosage,

    @NotBlank(message = "La frecuencia es obligatoria")
    String frequency,

    @NotNull(message = "La duración en días es obligatoria")
    @Min(value = 1, message = "La duración mínima es 1 día")
    @Max(value = 365, message = "La duración máxima es 365 días")
    Integer durationDays,

    String instructions
) {}
