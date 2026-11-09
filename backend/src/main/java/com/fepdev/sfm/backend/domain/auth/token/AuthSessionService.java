package com.fepdev.sfm.backend.domain.auth.token;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fepdev.sfm.backend.security.JwtService;
import com.fepdev.sfm.backend.security.SystemUser;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;

/**
 * Ciclo de vida de la sesion: login, rotacion de refresh tokens y logout.
 *
 * <p>Cada login abre una familia. Cada refresh canjea el token actual y emite uno
 * nuevo dentro de la misma familia. Si un token ya canjeado reaparece fuera de la
 * ventana de gracia (pensada para refresh concurrentes entre pestañas o dispositivos
 * con relojes ligeramente desincronizados), se revoca la familia completa: un token
 * robado deja de servir y cierra la sesion legitima como señal de compromiso.</p>
 */
@Service
@Slf4j
public class AuthSessionService {

    private static final long CLEANUP_RETENTION_DAYS = 7;

    private final JwtService jwtService;
    private final RefreshTokenFamilyRepository familyRepository;
    private final RefreshTokenRecordRepository tokenRepository;
    private final Clock clock;
    private final MeterRegistry meterRegistry;
    private final long refreshTokenExpirationMs;
    private final Duration reuseGrace;

    public AuthSessionService(
            JwtService jwtService,
            RefreshTokenFamilyRepository familyRepository,
            RefreshTokenRecordRepository tokenRepository,
            Clock clock,
            MeterRegistry meterRegistry,
            @Value("${app.jwt.refresh-token-expiration}") long refreshTokenExpirationMs,
            @Value("${app.auth.refresh.grace-seconds:15}") long graceSeconds) {
        this.jwtService = jwtService;
        this.familyRepository = familyRepository;
        this.tokenRepository = tokenRepository;
        this.clock = clock;
        this.meterRegistry = meterRegistry;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
        this.reuseGrace = Duration.ofSeconds(graceSeconds);
    }

    @Transactional
    public SessionTokens startSession(SystemUser user) {
        OffsetDateTime now = OffsetDateTime.now(clock);

        RefreshTokenFamily family = new RefreshTokenFamily();
        family.setUserId(user.getId());
        family.setCreatedAt(now);
        familyRepository.save(family);

        return issue(user, family, now);
    }

    /**
     * La revocacion por reuso debe persistirse aunque la peticion termine en 401:
     * por eso InvalidRefreshTokenException no provoca rollback. El resto de errores
     * inesperados si revierten la transaccion.
     */
    @Transactional(noRollbackFor = InvalidRefreshTokenException.class)
    public SessionTokens rotate(String rawToken, SystemUser user) {
        UUID jti = parseUuid(safeExtractJti(rawToken));
        UUID familyId = safeExtractFamilyId(rawToken);

        RefreshTokenRecord record = tokenRepository.findByJtiForUpdate(jti)
                .orElseThrow(InvalidRefreshTokenException::new);

        RefreshTokenFamily family = record.getFamily();
        OffsetDateTime now = OffsetDateTime.now(clock);

        if (!family.getId().equals(familyId)
                || !family.getUserId().equals(user.getId())
                || !matchesHash(rawToken, record.getTokenHash())) {
            revokeFamily(family, now, "reuse");
            throw new InvalidRefreshTokenException();
        }

        if (family.isRevoked() || record.isRevoked() || record.isExpired(now)) {
            throw new InvalidRefreshTokenException();
        }

        if (record.isUsed()) {
            Duration sinceUse = Duration.between(record.getUsedAt(), now);
            if (sinceUse.compareTo(reuseGrace) > 0) {
                // Reuso fuera de la ventana de concurrencia: el token fue robado o
                // reutilizado. Se invalida toda la familia.
                meterRegistry.counter("auth.refresh.reuse").increment();
                log.warn("Reuso de refresh token detectado; se revoca la familia {} del usuario {}",
                        family.getId(), family.getUserId());
                revokeFamily(family, now, "reuse");
                throw new InvalidRefreshTokenException(
                        "La sesion fue revocada por seguridad. Inicia sesion de nuevo.");
            }
            // Dentro de la ventana de gracia se asume refresh concurrente: se permite
            // rotar de nuevo sin castigar a la sesion.
        }

        record.markUsed(now);
        tokenRepository.save(record);

        return issue(user, family, now);
    }

    @Transactional
    public void revokeSession(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }

        try {
            UUID jti = parseUuid(jwtService.extractJti(rawToken));
            tokenRepository.findByJti(jti).ifPresent(record -> {
                revokeFamily(record.getFamily(), OffsetDateTime.now(clock), "logout");
                tokenRepository.save(record);
            });
        } catch (RuntimeException ignored) {
            // Un token ilegible no tiene familia que revocar; el logout igual limpia cookies.
        }
    }

    /**
     * Limpieza diaria de tokens vencidos. Se conserva una semana de historico para
     * poder diagnosticar reusos sin que la tabla crezca sin limite.
     */
    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void cleanupExpiredTokens() {
        OffsetDateTime cutoff = OffsetDateTime.now(clock).minusDays(CLEANUP_RETENTION_DAYS);
        tokenRepository.deleteExpiredBefore(cutoff);
        tokenRepository.deleteRevokedBefore(cutoff);
    }

    private SessionTokens issue(SystemUser user, RefreshTokenFamily family, OffsetDateTime now) {
        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user, family.getId());

        RefreshTokenRecord record = new RefreshTokenRecord();
        record.setFamily(family);
        record.setJti(parseUuid(jwtService.extractJti(refreshToken)));
        record.setTokenHash(hash(refreshToken));
        record.setIssuedAt(now);
        record.setExpiresAt(now.plus(Duration.ofMillis(refreshTokenExpirationMs)));
        tokenRepository.save(record);

        return new SessionTokens(accessToken, refreshToken, user.getRole().name(),
                user.getId(), user.getUsername());
    }

    private void revokeFamily(RefreshTokenFamily family, OffsetDateTime now, String reason) {
        if (!family.isRevoked()) {
            family.revoke(now, reason);
            familyRepository.save(family);
        }
    }

    private String safeExtractJti(String token) {
        try {
            return jwtService.extractJti(token);
        } catch (RuntimeException ex) {
            throw new InvalidRefreshTokenException();
        }
    }

    private UUID safeExtractFamilyId(String token) {
        try {
            UUID familyId = jwtService.extractFamilyId(token);
            if (familyId == null) {
                throw new InvalidRefreshTokenException();
            }
            return familyId;
        } catch (InvalidRefreshTokenException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw new InvalidRefreshTokenException();
        }
    }

    private UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (RuntimeException ex) {
            throw new InvalidRefreshTokenException();
        }
    }

    private boolean matchesHash(String rawToken, String expectedHash) {
        byte[] actual = hash(rawToken).getBytes(StandardCharsets.UTF_8);
        byte[] expected = expectedHash.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(actual, expected);
    }

    private static String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 no disponible", ex);
        }
    }
}
