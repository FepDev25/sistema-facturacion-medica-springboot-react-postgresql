package com.fepdev.sfm.backend.domain.auth.token;

import java.util.UUID;

public record SessionTokens(String accessToken, String refreshToken, String role, UUID userId, String username) {}
