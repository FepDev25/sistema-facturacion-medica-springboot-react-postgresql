package com.fepdev.sfm.backend.domain.medicalrecord.dto;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record MedicalRecordCreateRequest(

    @NotNull(message = "El ID del paciente es obligatorio")
    UUID patientId,

    @NotNull(message = "El ID de la cita es obligatorio")
    UUID appointmentId,

    // JSONB: estructura libre con signos vitales (ej. {"heartRate": 80, "temperature": 36.5})
    Map<String, Object> vitalSigns,

    String physicalExam,

    @NotBlank(message = "Las notas clínicas son obligatorias")
    String clinicalNotes,

    @NotNull(message = "La fecha del registro es obligatoria")
    OffsetDateTime recordDate
) {}
