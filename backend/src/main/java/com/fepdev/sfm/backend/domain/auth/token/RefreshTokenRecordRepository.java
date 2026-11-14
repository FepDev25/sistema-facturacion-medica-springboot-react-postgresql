package com.fepdev.sfm.backend.domain.auth.token;

import jakarta.persistence.LockModeType;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RefreshTokenRecordRepository extends JpaRepository<RefreshTokenRecord, UUID> {

    /**
     * Bloquea la fila durante la rotacion para que dos refresh concurrentes no
     * lean el mismo estado de "no usado" y emitan dos tokens sin control.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RefreshTokenRecord r WHERE r.jti = :jti")
    Optional<RefreshTokenRecord> findByJtiForUpdate(@Param("jti") UUID jti);

    Optional<RefreshTokenRecord> findByJti(UUID jti);

    @Modifying
    @Query("DELETE FROM RefreshTokenRecord r WHERE r.expiresAt < :cutoff")
    int deleteExpiredBefore(@Param("cutoff") OffsetDateTime cutoff);

    @Modifying
    @Query(value = """
            DELETE FROM refresh_token_families f
            WHERE f.revoked_at IS NOT NULL
              AND f.revoked_at < :cutoff
              AND NOT EXISTS (SELECT 1 FROM refresh_tokens r WHERE r.family_id = f.id)
            """, nativeQuery = true)
    int deleteRevokedBefore(@Param("cutoff") OffsetDateTime cutoff);
}
