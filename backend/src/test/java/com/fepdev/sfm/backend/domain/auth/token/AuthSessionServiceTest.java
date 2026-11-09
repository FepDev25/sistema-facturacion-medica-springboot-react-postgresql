package com.fepdev.sfm.backend.domain.auth.token;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.security.JwtService;
import com.fepdev.sfm.backend.security.Role;
import com.fepdev.sfm.backend.security.SystemUser;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

@ExtendWith(MockitoExtension.class)
class AuthSessionServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID FAMILY_ID = UUID.randomUUID();
    private static final UUID JTI = UUID.randomUUID();
    private static final String RAW_TOKEN = "raw-refresh-token";
    private static final Instant NOW = Instant.parse("2026-01-01T10:00:00Z");

    @Mock
    JwtService jwtService;

    @Mock
    RefreshTokenFamilyRepository familyRepository;

    @Mock
    RefreshTokenRecordRepository tokenRepository;

    SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();

    AuthSessionService service;
    SystemUser user;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
        service = new AuthSessionService(jwtService, familyRepository, tokenRepository, clock,
                meterRegistry, Duration.ofDays(7).toMillis(), 15);

        user = new SystemUser();
        ReflectionTestUtils.setField(user, "id", USER_ID);
        ReflectionTestUtils.setField(user, "username", "admin");
        ReflectionTestUtils.setField(user, "role", Role.ADMIN);
    }

    private static String hash(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    private RefreshTokenFamily family() {
        RefreshTokenFamily family = new RefreshTokenFamily();
        family.setId(FAMILY_ID);
        family.setUserId(USER_ID);
        family.setCreatedAt(now());
        return family;
    }

    private RefreshTokenRecord record(RefreshTokenFamily family) {
        RefreshTokenRecord record = new RefreshTokenRecord();
        record.setFamily(family);
        record.setJti(JTI);
        record.setTokenHash(hash(RAW_TOKEN));
        record.setIssuedAt(now());
        record.setExpiresAt(now().plusDays(7));
        return record;
    }

    private OffsetDateTime now() {
        return OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC);
    }

    private void stubIssuedTokens() {
        when(jwtService.generateAccessToken(user)).thenReturn("new-access");
        when(jwtService.generateRefreshToken(user, FAMILY_ID)).thenReturn("new-refresh");
        when(jwtService.extractJti("new-refresh")).thenReturn(UUID.randomUUID().toString());
    }

    @Test
    void startSession_createsFamilyAndStoresHashedToken() {
        when(familyRepository.save(any())).thenAnswer(invocation -> {
            RefreshTokenFamily saved = invocation.getArgument(0);
            saved.setId(FAMILY_ID);
            return saved;
        });
        when(jwtService.generateAccessToken(user)).thenReturn("access-token");
        when(jwtService.generateRefreshToken(user, FAMILY_ID)).thenReturn("refresh-token");
        when(jwtService.extractJti("refresh-token")).thenReturn(JTI.toString());

        SessionTokens tokens = service.startSession(user);

        assertThat(tokens.accessToken()).isEqualTo("access-token");
        assertThat(tokens.refreshToken()).isEqualTo("refresh-token");
        assertThat(tokens.userId()).isEqualTo(USER_ID);

        verify(familyRepository).save(any(RefreshTokenFamily.class));

        org.mockito.ArgumentCaptor<RefreshTokenRecord> captor =
                org.mockito.ArgumentCaptor.forClass(RefreshTokenRecord.class);
        verify(tokenRepository).save(captor.capture());

        RefreshTokenRecord saved = captor.getValue();
        assertThat(saved.getTokenHash()).hasSize(64).isEqualTo(hash("refresh-token"));
        assertThat(saved.getExpiresAt()).isEqualTo(now().plusDays(7));
    }

    @Test
    void rotate_whenValidToken_marksUsedAndIssuesNewToken() {
        RefreshTokenFamily family = family();
        RefreshTokenRecord record = record(family);

        when(jwtService.extractJti(RAW_TOKEN)).thenReturn(JTI.toString());
        when(jwtService.extractFamilyId(RAW_TOKEN)).thenReturn(FAMILY_ID);
        when(tokenRepository.findByJtiForUpdate(JTI)).thenReturn(Optional.of(record));
        stubIssuedTokens();

        SessionTokens tokens = service.rotate(RAW_TOKEN, user);

        assertThat(tokens.accessToken()).isEqualTo("new-access");
        assertThat(record.getUsedAt()).isEqualTo(now());
        verify(tokenRepository, times(2)).save(any(RefreshTokenRecord.class));
    }

    @Test
    void rotate_whenTokenReusedOutsideGrace_revokesFamily() {
        RefreshTokenFamily family = family();
        RefreshTokenRecord record = record(family);
        record.setUsedAt(now().minusSeconds(30));

        when(jwtService.extractJti(RAW_TOKEN)).thenReturn(JTI.toString());
        when(jwtService.extractFamilyId(RAW_TOKEN)).thenReturn(FAMILY_ID);
        when(tokenRepository.findByJtiForUpdate(JTI)).thenReturn(Optional.of(record));

        assertThatThrownBy(() -> service.rotate(RAW_TOKEN, user))
                .isInstanceOf(InvalidRefreshTokenException.class);

        assertThat(family.isRevoked()).isTrue();
        assertThat(family.getRevokeReason()).isEqualTo("reuse");
        assertThat(meterRegistry.counter("auth.refresh.reuse").count()).isEqualTo(1.0);
    }

    @Test
    void rotate_whenTokenReusedInsideGrace_allowsConcurrentRefresh() {
        RefreshTokenFamily family = family();
        RefreshTokenRecord record = record(family);
        record.setUsedAt(now().minusSeconds(5));

        when(jwtService.extractJti(RAW_TOKEN)).thenReturn(JTI.toString());
        when(jwtService.extractFamilyId(RAW_TOKEN)).thenReturn(FAMILY_ID);
        when(tokenRepository.findByJtiForUpdate(JTI)).thenReturn(Optional.of(record));
        stubIssuedTokens();

        SessionTokens tokens = service.rotate(RAW_TOKEN, user);

        assertThat(tokens.refreshToken()).isEqualTo("new-refresh");
        assertThat(family.isRevoked()).isFalse();
        assertThat(meterRegistry.counter("auth.refresh.reuse").count()).isZero();
    }

    @Test
    void rotate_whenTokenExpired_throwsWithoutRevoking() {
        RefreshTokenFamily family = family();
        RefreshTokenRecord record = record(family);
        record.setExpiresAt(now().minusSeconds(1));

        when(jwtService.extractJti(RAW_TOKEN)).thenReturn(JTI.toString());
        when(jwtService.extractFamilyId(RAW_TOKEN)).thenReturn(FAMILY_ID);
        when(tokenRepository.findByJtiForUpdate(JTI)).thenReturn(Optional.of(record));

        assertThatThrownBy(() -> service.rotate(RAW_TOKEN, user))
                .isInstanceOf(InvalidRefreshTokenException.class);
        assertThat(family.isRevoked()).isFalse();
    }

    @Test
    void rotate_whenFamilyRevoked_throws() {
        RefreshTokenFamily family = family();
        family.revoke(now().minusMinutes(1), "logout");
        RefreshTokenRecord record = record(family);

        when(jwtService.extractJti(RAW_TOKEN)).thenReturn(JTI.toString());
        when(jwtService.extractFamilyId(RAW_TOKEN)).thenReturn(FAMILY_ID);
        when(tokenRepository.findByJtiForUpdate(JTI)).thenReturn(Optional.of(record));

        assertThatThrownBy(() -> service.rotate(RAW_TOKEN, user))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void rotate_whenHashDoesNotMatch_revokesFamily() {
        RefreshTokenFamily family = family();
        RefreshTokenRecord record = record(family);
        record.setTokenHash("0".repeat(64));

        when(jwtService.extractJti(RAW_TOKEN)).thenReturn(JTI.toString());
        when(jwtService.extractFamilyId(RAW_TOKEN)).thenReturn(FAMILY_ID);
        when(tokenRepository.findByJtiForUpdate(JTI)).thenReturn(Optional.of(record));

        assertThatThrownBy(() -> service.rotate(RAW_TOKEN, user))
                .isInstanceOf(InvalidRefreshTokenException.class);
        assertThat(family.isRevoked()).isTrue();
    }

    @Test
    void rotate_whenTokenDoesNotExist_throws() {
        when(jwtService.extractJti(RAW_TOKEN)).thenReturn(JTI.toString());
        when(jwtService.extractFamilyId(RAW_TOKEN)).thenReturn(FAMILY_ID);
        when(tokenRepository.findByJtiForUpdate(JTI)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.rotate(RAW_TOKEN, user))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void rotate_whenJtiMalformed_throws() {
        when(jwtService.extractJti(RAW_TOKEN)).thenReturn("not-a-uuid");

        assertThatThrownBy(() -> service.rotate(RAW_TOKEN, user))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void revokeSession_revokesFamily() {
        RefreshTokenFamily family = family();
        RefreshTokenRecord record = record(family);

        when(jwtService.extractJti(RAW_TOKEN)).thenReturn(JTI.toString());
        when(tokenRepository.findByJti(JTI)).thenReturn(Optional.of(record));

        service.revokeSession(RAW_TOKEN);

        assertThat(family.isRevoked()).isTrue();
        assertThat(family.getRevokeReason()).isEqualTo("logout");
        verify(familyRepository).save(family);
    }

    @Test
    void revokeSession_withBlankOrMalformedToken_isNoop() {
        service.revokeSession(null);
        service.revokeSession("  ");

        when(jwtService.extractJti("bad")).thenThrow(new RuntimeException("bad"));
        service.revokeSession("bad");

        verify(tokenRepository, times(0)).findByJti(any());
    }

    @Test
    void cleanupExpiredTokens_deletesOlderThanRetentionWindow() {
        service.cleanupExpiredTokens();

        verify(tokenRepository).deleteExpiredBefore(now().minusDays(7));
        verify(tokenRepository).deleteRevokedBefore(now().minusDays(7));
    }
}
