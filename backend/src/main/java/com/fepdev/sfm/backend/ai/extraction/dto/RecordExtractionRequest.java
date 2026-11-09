package com.fepdev.sfm.backend.ai.extraction.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RecordExtractionRequest(

    @NotNull(message = "El ID de la cita es obligatorio")
    UUID appointmentId,

    @NotNull(message = "El ID del registro médico es obligatorio")
    UUID medicalRecordId,

    @NotBlank(message = "Las notas clínicas son obligatorias")
    @Size(max = 8000, message = "Las notas clínicas no pueden exceder los 8000 caracteres")
    String clinicalNotes,

    @Size(max = 4000, message = "El examen físico no puede exceder los 4000 caracteres")
    String physicalExam,

    @Size(max = 1000, message = "El motivo de consulta no puede exceder los 1000 caracteres")
    String chiefComplaint
) {}
