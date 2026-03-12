package com.fepdev.sfm.backend.domain.appointment.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.fepdev.sfm.backend.domain.appointment.Status;

public record AppointmentSummaryResponse(
    UUID id,
    String patientFirstName,
    String patientLastName,
    String doctorFirstName,
    String doctorLastName,
    OffsetDateTime scheduledAt,
    Status status
) {}
