package com.fepdev.sfm.backend.domain.doctor.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DoctorResponse(
    UUID id,
    String licenseNumber,
    String firstName,
    String lastName,
    String specialty,
    String phone,
    String email,
    boolean isActive,
    UUID userId,
    String username,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
