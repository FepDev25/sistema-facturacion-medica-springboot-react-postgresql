package com.fepdev.sfm.backend.domain.medicalrecord.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.fepdev.sfm.backend.domain.medicalrecord.Severity;

public record DiagnosisResponse(
    UUID id,
    UUID appointmentId,
    UUID medicalRecordId,
    String icd10Code,
    String description,
    Severity severity,
    OffsetDateTime diagnosedAt,
    OffsetDateTime createdAt
) {}
