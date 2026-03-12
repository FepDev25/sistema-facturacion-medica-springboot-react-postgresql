package com.fepdev.sfm.backend.domain.insurance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record InsurancePolicyResponse(
    UUID id,
    UUID patientId,
    String patientFirstName,
    String patientLastName,
    UUID providerId,
    String providerName,
    String policyNumber,
    BigDecimal coveragePercentage,
    BigDecimal deductible,
    LocalDate startDate,
    LocalDate endDate,
    boolean isActive,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
