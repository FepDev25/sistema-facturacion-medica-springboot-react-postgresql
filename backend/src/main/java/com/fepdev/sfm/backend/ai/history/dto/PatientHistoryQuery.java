package com.fepdev.sfm.backend.ai.history.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PatientHistoryQuery(
        @NotBlank @Size(max = 500, message = "La pregunta no puede exceder los 500 caracteres")
        String question) {}
