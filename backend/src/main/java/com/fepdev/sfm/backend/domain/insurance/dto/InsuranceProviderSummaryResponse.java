package com.fepdev.sfm.backend.domain.insurance.dto;

import java.util.UUID;

public record InsuranceProviderSummaryResponse(
    UUID id,
    String name,
    String code,
    boolean isActive
) {}
