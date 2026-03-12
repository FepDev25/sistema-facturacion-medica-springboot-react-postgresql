package com.fepdev.sfm.backend.domain.medicalrecord.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ProcedureResponse(
    UUID id,
    UUID appointmentId,
    UUID medicalRecordId,
    String procedureCode,
    String description,
    String notes,
    OffsetDateTime performedAt,
    OffsetDateTime createdAt
) {}
