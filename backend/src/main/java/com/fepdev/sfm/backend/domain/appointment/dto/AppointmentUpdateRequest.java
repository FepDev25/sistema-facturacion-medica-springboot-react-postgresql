package com.fepdev.sfm.backend.domain.appointment.dto;

import java.time.OffsetDateTime;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record AppointmentUpdateRequest(

    @FutureOrPresent(message = "La cita debe ser en el presente o futuro")
    OffsetDateTime scheduledAt,

    @Positive(message = "La duración debe ser un valor positivo")
    Integer durationMinutes,

    @Size(max = 500, message = "El motivo de consulta no puede exceder los 500 caracteres")
    String chiefComplaint,

    String notes
) {}
