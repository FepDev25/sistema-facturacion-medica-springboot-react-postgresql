package com.fepdev.sfm.backend.security.dto;

import java.util.UUID;

public record SystemUserSummaryResponse(
        UUID id,
        String username,
        String email,
        String role,
        boolean active
) {}
