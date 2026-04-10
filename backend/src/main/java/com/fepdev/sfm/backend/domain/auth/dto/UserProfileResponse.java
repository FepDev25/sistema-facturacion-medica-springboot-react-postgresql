package com.fepdev.sfm.backend.domain.auth.dto;

import java.util.UUID;

import com.fepdev.sfm.backend.security.SystemUser;

public record UserProfileResponse(
        UUID id,
        String username,
        String email,
        String role,
        boolean active,
        UUID doctorId,
        String doctorFirstName,
        String doctorLastName
) {
    public static UserProfileResponse from(SystemUser user) {
        UUID doctorId = null;
        String doctorFirstName = null;
        String doctorLastName = null;
        if (user.getDoctor() != null) {
            doctorId = user.getDoctor().getId();
            doctorFirstName = user.getDoctor().getFirstName();
            doctorLastName = user.getDoctor().getLastName();
        }
        return new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole().name(),
                user.isActive(),
                doctorId,
                doctorFirstName,
                doctorLastName
        );
    }
}
