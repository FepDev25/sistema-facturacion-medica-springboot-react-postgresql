package com.fepdev.sfm.backend.domain.insurance.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InsuranceProviderCreateRequest(

    @NotBlank(message = "El nombre del proveedor es obligatorio")
    @Size(max = 200, message = "El nombre no puede exceder los 200 caracteres")
    String name,

    @NotBlank(message = "El código del proveedor es obligatorio")
    @Size(max = 50, message = "El código no puede exceder los 50 caracteres")
    String code,

    @NotBlank(message = "El teléfono es obligatorio")
    @Size(max = 20, message = "El teléfono no puede exceder los 20 caracteres")
    String phone,

    @Email(message = "El formato del correo electrónico no es válido")
    @Size(max = 100, message = "El correo no puede exceder los 100 caracteres")
    String email,

    @Size(max = 255, message = "La dirección no puede exceder los 255 caracteres")
    String address
) {}
