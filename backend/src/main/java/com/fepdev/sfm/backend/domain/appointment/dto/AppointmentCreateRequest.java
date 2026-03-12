package com.fepdev.sfm.backend.domain.appointment.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record AppointmentCreateRequest(

    @NotNull(message = "El ID del paciente es obligatorio")
    UUID patientId,

    @NotNull(message = "El ID del doctor es obligatorio")
    UUID doctorId,

    @NotNull(message = "La fecha y hora de la cita es obligatoria")
    @FutureOrPresent(message = "La cita debe ser en el presente o futuro")
    OffsetDateTime scheduledAt,

    @NotNull(message = "La duración en minutos es obligatoria")
    @Positive(message = "La duración debe ser un valor positivo")
    Integer durationMinutes,

    @Size(max = 500, message = "El motivo de consulta no puede exceder los 500 caracteres")
    String chiefComplaint,

    String notes
) {}
