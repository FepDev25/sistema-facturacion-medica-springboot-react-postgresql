package com.fepdev.sfm.backend.domain.medicalrecord.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

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
    @Positive(message = "La duración debe ser un valor positivo")
    Integer durationDays,

    String instructions
) {}
