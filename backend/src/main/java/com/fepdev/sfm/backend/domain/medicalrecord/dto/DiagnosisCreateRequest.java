package com.fepdev.sfm.backend.domain.medicalrecord.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.fepdev.sfm.backend.domain.medicalrecord.Severity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DiagnosisCreateRequest(

    @NotNull(message = "El ID de la cita es obligatorio")
    UUID appointmentId,

    @NotNull(message = "El ID del registro médico es obligatorio")
    UUID medicalRecordId,

    @NotBlank(message = "El código ICD-10 es obligatorio")
    @Size(max = 10, message = "El código ICD-10 no puede exceder los 10 caracteres")
    String icd10Code,

    @NotBlank(message = "La descripción es obligatoria")
    String description,

    // los valores válidos son los del enum Severity
    Severity severity,

    @NotNull(message = "La fecha de diagnóstico es obligatoria")
    OffsetDateTime diagnosedAt
) {}
