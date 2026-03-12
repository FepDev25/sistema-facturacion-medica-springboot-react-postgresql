package com.fepdev.sfm.backend.domain.medicalrecord.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProcedureCreateRequest(

    @NotNull(message = "El ID de la cita es obligatorio")
    UUID appointmentId,

    @NotNull(message = "El ID del registro médico es obligatorio")
    UUID medicalRecordId,

    @NotBlank(message = "El código del procedimiento es obligatorio")
    @Size(max = 50, message = "El código del procedimiento no puede exceder los 50 caracteres")
    String procedureCode,

    @NotBlank(message = "La descripción es obligatoria")
    String description,

    String notes,

    @NotNull(message = "La fecha de realización es obligatoria")
    OffsetDateTime performedAt
) {}
