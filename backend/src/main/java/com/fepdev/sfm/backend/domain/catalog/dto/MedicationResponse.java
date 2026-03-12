package com.fepdev.sfm.backend.domain.catalog.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.fepdev.sfm.backend.domain.catalog.Unit;

public record MedicationResponse(
    UUID id,
    String code,
    String name,
    String description,
    BigDecimal price,
    Unit unit,
    boolean requiresPrescription,
    boolean isActive,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
