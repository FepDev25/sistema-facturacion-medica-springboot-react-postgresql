package com.fepdev.sfm.backend.domain.catalog.dto;

import com.fepdev.sfm.backend.domain.catalog.Unit;
import java.math.BigDecimal;
import java.util.UUID;

public record MedicationSummaryResponse(UUID id, String code, String name, BigDecimal price, Unit unit) {}
