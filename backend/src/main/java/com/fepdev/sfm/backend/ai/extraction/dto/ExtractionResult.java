package com.fepdev.sfm.backend.ai.extraction.dto;

import java.util.List;

public record ExtractionResult(
    List<ExtractedDiagnosis> diagnoses,
    List<ExtractedPrescription> prescriptions,
    List<ExtractedProcedure> procedures
) {}
