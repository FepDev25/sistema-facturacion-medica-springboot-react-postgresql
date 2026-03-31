package com.fepdev.sfm.backend.domain.auth.dto;

// Respuesta de autenticacion
// refreshToken es null en la respuesta del endpoint /refresh, solo se renueva el access token
public record TokenResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        String role
) {
    public static TokenResponse login(String accessToken, String refreshToken, String role) {
        return new TokenResponse(accessToken, refreshToken, "Bearer", role);
    }

    public static TokenResponse refresh(String accessToken, String role) {
        return new TokenResponse(accessToken, null, "Bearer", role);
    }
}
