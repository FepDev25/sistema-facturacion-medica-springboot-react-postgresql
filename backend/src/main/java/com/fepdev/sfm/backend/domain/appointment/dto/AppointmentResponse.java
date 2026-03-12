package com.fepdev.sfm.backend.domain.appointment.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.fepdev.sfm.backend.domain.appointment.Status;

public record AppointmentResponse(
    UUID id,
    UUID patientId,
    String patientFirstName,
    String patientLastName,
    UUID doctorId,
    String doctorFirstName,
    String doctorLastName,
    OffsetDateTime scheduledAt,
    OffsetDateTime scheduledEndAt,
    Integer durationMinutes,
    Status status,
    String chiefComplaint,
    String notes,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
