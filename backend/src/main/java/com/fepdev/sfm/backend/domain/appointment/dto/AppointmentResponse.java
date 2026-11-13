package com.fepdev.sfm.backend.domain.appointment.dto;

import com.fepdev.sfm.backend.domain.appointment.Status;
import java.time.OffsetDateTime;
import java.util.UUID;

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
        UUID invoiceId,
        String invoiceNumber,
        String chiefComplaint,
        String notes,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
