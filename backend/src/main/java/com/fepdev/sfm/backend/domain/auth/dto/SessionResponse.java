package com.fepdev.sfm.backend.domain.auth.dto;

import java.util.UUID;

import com.fepdev.sfm.backend.domain.auth.token.SessionTokens;

/**
 * Datos no sensibles de la sesion. Los tokens viajan en cookies {@code httpOnly},
 * por lo que nunca aparecen en el cuerpo de la respuesta.
 */
public record SessionResponse(
        String role,
        UUID userId,
        String username
) {
    public static SessionResponse from(SessionTokens tokens) {
        return new SessionResponse(tokens.role(), tokens.userId(), tokens.username());
    }
}
