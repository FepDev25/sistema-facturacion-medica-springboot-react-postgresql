package com.fepdev.sfm.backend.domain.catalog.dto;

import com.fepdev.sfm.backend.domain.catalog.Category;
import java.math.BigDecimal;
import java.util.UUID;

public record ServiceSummaryResponse(
        UUID id, String code, String name, BigDecimal price, Category category, Boolean isActive) {}
