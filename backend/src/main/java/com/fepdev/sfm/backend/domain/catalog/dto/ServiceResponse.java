package com.fepdev.sfm.backend.domain.catalog.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.fepdev.sfm.backend.domain.catalog.Category;

public record ServiceResponse(
    UUID id,
    String code,
    String name,
    String description,
    BigDecimal price,
    Category category,
    Boolean isActive,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
