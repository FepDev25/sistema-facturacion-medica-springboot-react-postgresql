package com.fepdev.sfm.backend.ai.extraction.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RecordExtractionRequest(

    @NotNull(message = "El ID de la cita es obligatorio")
    UUID appointmentId,

    @NotNull(message = "El ID del registro médico es obligatorio")
    UUID medicalRecordId,

    @NotBlank(message = "Las notas clínicas son obligatorias")
    String clinicalNotes,

    String physicalExam,

    String chiefComplaint
) {}
