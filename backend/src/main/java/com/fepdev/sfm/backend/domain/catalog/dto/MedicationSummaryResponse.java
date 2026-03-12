package com.fepdev.sfm.backend.domain.catalog.dto;

import java.math.BigDecimal;
import java.util.UUID;

import com.fepdev.sfm.backend.domain.catalog.Unit;

public record MedicationSummaryResponse(
    UUID id,
    String code,
    String name,
    BigDecimal price,
    Unit unit
) {}
