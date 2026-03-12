package com.fepdev.sfm.backend.domain.catalog.dto;

import java.math.BigDecimal;
import java.util.UUID;

import com.fepdev.sfm.backend.domain.catalog.Category;

public record ServiceSummaryResponse(
    UUID id,
    String code,
    String name,
    BigDecimal price,
    Category category,
    Boolean isActive
) {}
