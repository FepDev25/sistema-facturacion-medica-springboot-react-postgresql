package com.fepdev.sfm.backend.ai.extraction.dto;

import java.util.UUID;

public record ExtractedPrescription(
    String medicationName,
    UUID matchedMedicationId,
    String dosage,
    String frequency,
    Integer durationDays,
    String instructions
) {}
