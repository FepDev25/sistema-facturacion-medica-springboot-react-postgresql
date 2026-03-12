package com.fepdev.sfm.backend.domain.appointment.dto;

import com.fepdev.sfm.backend.domain.appointment.Status;

import jakarta.validation.constraints.NotNull;

public record AppointmentStatusUpdateRequest(

    @NotNull(message = "El estado es obligatorio")
    Status status
) {}
