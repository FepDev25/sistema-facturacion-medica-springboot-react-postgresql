package com.fepdev.sfm.backend.ai.icd10.dto;

import jakarta.validation.constraints.NotBlank;

public record Icd10Query(
        @NotBlank String query
) {}
