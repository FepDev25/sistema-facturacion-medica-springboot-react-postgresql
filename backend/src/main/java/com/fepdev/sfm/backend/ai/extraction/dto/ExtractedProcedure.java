package com.fepdev.sfm.backend.ai.extraction.dto;

public record ExtractedProcedure(
    String procedureCode,
    String description,
    String notes
) {}
