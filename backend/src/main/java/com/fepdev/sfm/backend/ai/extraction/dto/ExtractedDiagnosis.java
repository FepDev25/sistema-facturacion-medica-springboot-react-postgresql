package com.fepdev.sfm.backend.ai.extraction.dto;

public record ExtractedDiagnosis(
    String icd10Code,
    String description,
    String severity
) {}
