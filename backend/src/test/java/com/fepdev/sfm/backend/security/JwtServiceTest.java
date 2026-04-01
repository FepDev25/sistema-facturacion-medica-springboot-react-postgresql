package com.fepdev.sfm.backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import io.jsonwebtoken.ExpiredJwtException;

class JwtServiceTest {

    private JwtService jwtService;

    private final UserDetails user = User.withUsername("ana")
            .password("secret")
            .authorities("ADMIN")
            .build();

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        String base64Secret = Base64.getEncoder()
                .encodeToString("01234567890123456789012345678901".getBytes(StandardCharsets.UTF_8));
        ReflectionTestUtils.setField(jwtService, "secret", base64Secret);
        ReflectionTestUtils.setField(jwtService, "accessTokenExpiration", 60_000L);
        ReflectionTestUtils.setField(jwtService, "refreshTokenExpiration", 120_000L);
    }

    @Test
    void generateAccessToken_extractClaims_and_validateType() {
        String token = jwtService.generateAccessToken(user);

        assertThat(jwtService.extractUsername(token)).isEqualTo("ana");
        assertThat(jwtService.extractJti(token)).isNotBlank();
        assertThat(jwtService.isAccessTokenValid(token, user)).isTrue();
        assertThat(jwtService.isRefreshTokenValid(token, user)).isFalse();
        assertThat(jwtService.getRemainingTtl(token)).isPositive();
    }

    @Test
    void generateRefreshToken_validOnlyAsRefresh() {
        String token = jwtService.generateRefreshToken(user);

        assertThat(jwtService.isRefreshTokenValid(token, user)).isTrue();
        assertThat(jwtService.isAccessTokenValid(token, user)).isFalse();
    }

    @Test
    void accessToken_forDifferentUser_isInvalid() {
        UserDetails otherUser = User.withUsername("luis")
                .password("secret")
                .authorities("ADMIN")
                .build();

        String token = jwtService.generateAccessToken(user);

        assertThat(jwtService.isAccessTokenValid(token, otherUser)).isFalse();
    }

    @Test
    void remainingTtl_forExpiredToken_throwsExpiredJwtException() {
        ReflectionTestUtils.setField(jwtService, "accessTokenExpiration", -1_000L);
        String expiredToken = jwtService.generateAccessToken(user);

        assertThatThrownBy(() -> jwtService.getRemainingTtl(expiredToken))
                .isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    void extractUsername_withMalformedToken_throwsJwtException() {
        assertThatThrownBy(() -> jwtService.extractUsername("not-a-jwt"))
                .isInstanceOf(RuntimeException.class);
    }
}
