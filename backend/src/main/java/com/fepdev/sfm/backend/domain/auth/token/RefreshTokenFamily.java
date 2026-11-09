package com.fepdev.sfm.backend.domain.auth.token;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Agrupa todos los refresh tokens emitidos a partir de un mismo login.
 * Si se detecta reuso de un token rotado, se revoca la familia completa.
 */
@Entity
@Table(name = "refresh_token_families")
@Getter
@Setter
@NoArgsConstructor
public class RefreshTokenFamily {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "revoked_at")
    private OffsetDateTime revokedAt;

    @Column(name = "revoke_reason", length = 40)
    private String revokeReason;

    public boolean isRevoked() {
        return revokedAt != null;
    }

    public void revoke(OffsetDateTime when, String reason) {
        if (revokedAt == null) {
            this.revokedAt = when;
            this.revokeReason = reason;
        }
    }
}
