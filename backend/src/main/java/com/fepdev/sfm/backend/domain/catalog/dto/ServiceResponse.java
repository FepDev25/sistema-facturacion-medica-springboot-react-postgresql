package com.fepdev.sfm.backend.domain.catalog.dto;

import com.fepdev.sfm.backend.domain.catalog.Category;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ServiceResponse(
        UUID id,
        String code,
        String name,
        String description,
        BigDecimal price,
        Category category,
        Boolean isActive,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
