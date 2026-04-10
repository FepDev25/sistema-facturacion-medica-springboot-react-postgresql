package com.fepdev.sfm.backend.domain.auth.dto;

import java.util.UUID;

public record TokenResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        String role,
        UUID userId,
        String username
) {
    public static TokenResponse login(String accessToken, String refreshToken, String role, UUID userId, String username) {
        return new TokenResponse(accessToken, refreshToken, "Bearer", role, userId, username);
    }

    public static TokenResponse refresh(String accessToken, String role, UUID userId, String username) {
        return new TokenResponse(accessToken, null, "Bearer", role, userId, username);
    }
}
