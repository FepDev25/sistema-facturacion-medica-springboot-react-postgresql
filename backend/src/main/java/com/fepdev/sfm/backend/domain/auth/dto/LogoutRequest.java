package com.fepdev.sfm.backend.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LogoutRequest(
        @NotBlank(message = "El refresh token es obligatorio para revocar la sesion")
        String refreshToken
) {}
