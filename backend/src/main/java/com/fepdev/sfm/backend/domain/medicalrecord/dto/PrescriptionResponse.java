package com.fepdev.sfm.backend.domain.medicalrecord.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PrescriptionResponse(
    UUID id,
    UUID appointmentId,
    UUID medicalRecordId,
    UUID medicationId,
    String medicationName,
    String dosage,
    String frequency,
    Integer durationDays,
    String instructions,
    OffsetDateTime createdAt
) {}
