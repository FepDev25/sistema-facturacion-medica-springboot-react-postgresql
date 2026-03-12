package com.fepdev.sfm.backend.domain.insurance.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record InsurancePolicySummaryResponse(
    UUID id,
    String policyNumber,
    String providerName,
    BigDecimal coveragePercentage,
    boolean isActive
) {}
