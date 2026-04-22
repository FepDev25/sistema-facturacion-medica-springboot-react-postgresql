package com.fepdev.sfm.backend.ai.suggestion.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record SuggestedItem(
    String itemType,
    String name,
    UUID matchedCatalogId,
    BigDecimal unitPrice,
    String justification
) {}
