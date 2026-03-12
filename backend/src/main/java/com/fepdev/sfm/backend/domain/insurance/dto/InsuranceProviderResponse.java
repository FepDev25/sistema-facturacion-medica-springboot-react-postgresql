package com.fepdev.sfm.backend.domain.insurance.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record InsuranceProviderResponse(
    UUID id,
    String name,
    String code,
    String phone,
    String email,
    String address,
    boolean isActive,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
