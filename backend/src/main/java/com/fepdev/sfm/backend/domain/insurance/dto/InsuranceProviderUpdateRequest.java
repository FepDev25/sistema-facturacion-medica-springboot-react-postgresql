package com.fepdev.sfm.backend.domain.insurance.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InsuranceProviderUpdateRequest(

    @Size(max = 200, message = "El nombre no puede exceder los 200 caracteres")
    String name,

    @Size(max = 20, message = "El teléfono no puede exceder los 20 caracteres")
    String phone,

    @Email(message = "El formato del correo electrónico no es válido")
    @Size(max = 100, message = "El correo no puede exceder los 100 caracteres")
    String email,

    @Size(max = 255, message = "La dirección no puede exceder los 255 caracteres")
    String address,

    @NotNull(message = "El estado activo es obligatorio")
    Boolean isActive
) {}
