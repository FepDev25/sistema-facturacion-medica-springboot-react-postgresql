package com.fepdev.sfm.backend.ai.icd10.dto;

public record Icd10Suggestion(
        String code,
        String description,
        Double score
) {}
