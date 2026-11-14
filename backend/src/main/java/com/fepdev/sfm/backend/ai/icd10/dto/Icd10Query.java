package com.fepdev.sfm.backend.ai.icd10.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record Icd10Query(
        @NotBlank @Size(max = 500, message = "La consulta no puede exceder los 500 caracteres")
        String query) {}
