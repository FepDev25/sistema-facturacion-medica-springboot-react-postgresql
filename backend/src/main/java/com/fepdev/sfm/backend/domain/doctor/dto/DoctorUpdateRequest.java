package com.fepdev.sfm.backend.domain.doctor.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DoctorUpdateRequest(

    @Size(max = 100, message = "El primer nombre no puede exceder los 100 caracteres")
    String firstName,

    @Size(max = 100, message = "El apellido no puede exceder los 100 caracteres")
    String lastName,

    @Size(max = 100, message = "La especialidad no puede exceder los 100 caracteres")
    String specialty,

    @Size(max = 20, message = "El teléfono no puede exceder los 20 caracteres")
    String phone,

    @Email(message = "El formato del correo electrónico no es válido")
    @Size(max = 100, message = "El correo no puede exceder los 100 caracteres")
    String email,

    @NotNull(message = "El estado activo es obligatorio")
    Boolean isActive
) {}
