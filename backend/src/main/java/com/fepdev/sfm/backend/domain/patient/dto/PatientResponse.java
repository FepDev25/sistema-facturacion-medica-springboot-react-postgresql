package com.fepdev.sfm.backend.domain.patient.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.fepdev.sfm.backend.domain.patient.Gender;

public record PatientResponse(
    UUID id,
    String dni,
    String firstName,
    String lastName,
    LocalDate birthDate,
    Gender gender,
    String phone,
    String email,
    String address,
    String bloodType,
    String allergies,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
