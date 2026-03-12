package com.fepdev.sfm.backend.domain.patient.dto;

import java.util.UUID;

public record PatientSummaryResponse(
    UUID id,
    String dni,
    String firstName,
    String lastName,
    String phone
) {}
