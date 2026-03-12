package com.fepdev.sfm.backend.domain.doctor.dto;

import java.util.UUID;

public record DoctorSummaryResponse(
    UUID id,
    String firstName,
    String lastName,
    String specialty
) {}
