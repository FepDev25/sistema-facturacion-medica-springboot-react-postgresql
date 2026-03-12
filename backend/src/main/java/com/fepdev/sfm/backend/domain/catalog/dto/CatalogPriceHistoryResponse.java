package com.fepdev.sfm.backend.domain.catalog.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.fepdev.sfm.backend.domain.catalog.CatalogType;

public record CatalogPriceHistoryResponse(
    UUID id,
    CatalogType catalogType,
    UUID catalogId,
    String itemCode,
    String itemName,
    BigDecimal oldPrice,
    BigDecimal newPrice,
    OffsetDateTime changedAt
) {}
