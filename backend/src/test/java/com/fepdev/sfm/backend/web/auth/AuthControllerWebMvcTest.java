package com.fepdev.sfm.backend.web.auth;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import com.fepdev.sfm.backend.domain.auth.AuthController;
import com.fepdev.sfm.backend.domain.auth.token.AuthSessionService;
import com.fepdev.sfm.backend.domain.auth.token.InvalidRefreshTokenException;
import com.fepdev.sfm.backend.domain.auth.token.SessionTokens;
import com.fepdev.sfm.backend.security.AuthCookieService;
import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;
import com.fepdev.sfm.backend.security.JwtService;
import com.fepdev.sfm.backend.security.LoginAttemptService;
import com.fepdev.sfm.backend.security.LoginBlockedException;
import com.fepdev.sfm.backend.security.Role;
import com.fepdev.sfm.backend.security.SystemUser;
import com.fepdev.sfm.backend.security.TokenBlacklistService;
import com.fepdev.sfm.backend.security.UserDetailsServiceImpl;
import com.fepdev.sfm.backend.shared.exception.HandlerException;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.Cookie;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({HandlerException.class, AuthCookieService.class})
@TestPropertySource(properties = {
        "app.auth.cookies.secure=false",
        "app.auth.cookies.same-site=Strict",
        "app.jwt.access-token-expiration=900000",
        "app.jwt.refresh-token-expiration=604800000"
})
class AuthControllerWebMvcTest {

    private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    AuthenticationManager authenticationManager;

    @MockitoBean
    JwtService jwtService;

    @MockitoBean
    UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    TokenBlacklistService tokenBlacklistService;

    @MockitoBean
    AuthSessionService authSessionService;

    @MockitoBean
    LoginAttemptService loginAttemptService;

    @MockitoBean
    JwtAuthenticationFilter jwtAuthenticationFilter;

    private SystemUser activeAdmin() {
        SystemUser user = new SystemUser();
        ReflectionTestUtils.setField(user, "id", USER_ID);
        ReflectionTestUtils.setField(user, "username", "admin");
        ReflectionTestUtils.setField(user, "email", "admin@sfm.local");
        ReflectionTestUtils.setField(user, "passwordHash", "x");
        ReflectionTestUtils.setField(user, "role", Role.ADMIN);
        ReflectionTestUtils.setField(user, "active", true);
        return user;
    }

    private SessionTokens adminTokens() {
        return new SessionTokens("access-token", "refresh-token", "ADMIN", USER_ID, "admin");
    }

    @Test
    void login_whenValidRequest_setsHttpOnlyCookiesAndReturnsSessionMetadata() throws Exception {
        SystemUser user = activeAdmin();
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("admin", "pwd"));
        when(userDetailsService.loadUserByUsername("admin")).thenReturn(user);
        when(authSessionService.startSession(user)).thenReturn(adminTokens());

        String body = """
                {
                  "username": "admin",
                  "password": "123456"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/login").contentType("application/json").content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.userId").value(USER_ID.toString()))
                .andExpect(jsonPath("$.username").value("admin"))
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(header().stringValues("Set-Cookie",
                        org.hamcrest.Matchers.hasItem(containsString("sfm_access=access-token"))))
                .andExpect(header().stringValues("Set-Cookie",
                        org.hamcrest.Matchers.hasItem(containsString("sfm_refresh=refresh-token"))))
                .andExpect(header().stringValues("Set-Cookie",
                        org.hamcrest.Matchers.hasItem(containsString("HttpOnly"))));

        verify(loginAttemptService).recordSuccess(any(), eq("admin"));
    }

    @Test
    void login_whenInvalidCredentials_returns401AndRecordsFailure() throws Exception {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        String body = """
                {
                  "username": "admin",
                  "password": "incorrect"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/login").contentType("application/json").content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        verify(loginAttemptService).recordFailure(any(), eq("admin"));
        verify(authSessionService, never()).startSession(any());
    }

    @Test
    void login_whenRateLimited_returns429WithRetryAfter() throws Exception {
        doThrow(new LoginBlockedException(120))
                .when(loginAttemptService).checkAllowed(any(), any());

        mockMvc.perform(post("/api/v1/auth/login").contentType("application/json")
                        .content("{\"username\":\"admin\",\"password\":\"123456\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "120"))
                .andExpect(jsonPath("$.status").value(429));
    }

    @Test
    void refresh_whenValidCookie_rotatesAndSetsNewCookies() throws Exception {
        SystemUser user = activeAdmin();
        SessionTokens rotated = new SessionTokens("access-2", "refresh-2", "ADMIN", USER_ID, "admin");

        when(jwtService.extractUsername("refresh-token")).thenReturn("admin");
        when(userDetailsService.loadUserByUsername("admin")).thenReturn(user);
        when(authSessionService.rotate("refresh-token", user)).thenReturn(rotated);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new Cookie(AuthCookieService.REFRESH_COOKIE, "refresh-token")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(header().stringValues("Set-Cookie",
                        org.hamcrest.Matchers.hasItem(containsString("sfm_refresh=refresh-2"))));
    }

    @Test
    void refresh_withoutCookie_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void refresh_whenTokenMalformed_returns401AndClearsCookies() throws Exception {
        when(jwtService.extractUsername("bad-token")).thenThrow(new JwtException("Malformed"));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new Cookie(AuthCookieService.REFRESH_COOKIE, "bad-token")))
                .andExpect(status().isUnauthorized())
                .andExpect(header().stringValues("Set-Cookie",
                        org.hamcrest.Matchers.hasItem(containsString("sfm_refresh=;"))));
    }

    @Test
    void refresh_whenReuseDetected_returns401() throws Exception {
        SystemUser user = activeAdmin();
        when(jwtService.extractUsername("refresh-token")).thenReturn("admin");
        when(userDetailsService.loadUserByUsername("admin")).thenReturn(user);
        when(authSessionService.rotate("refresh-token", user))
                .thenThrow(new InvalidRefreshTokenException(
                        "La sesion fue revocada por seguridad. Inicia sesion de nuevo."));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new Cookie(AuthCookieService.REFRESH_COOKIE, "refresh-token")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(
                        "La sesion fue revocada por seguridad. Inicia sesion de nuevo."));
    }

    @Test
    void logout_revokesSessionBlacklistsAccessAndClearsCookies() throws Exception {
        when(jwtService.extractJti("access-token")).thenReturn("access-jti");
        when(jwtService.getRemainingTtl("access-token")).thenReturn(Duration.ofMinutes(5));

        mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(new Cookie(AuthCookieService.REFRESH_COOKIE, "refresh-token"))
                        .cookie(new Cookie(AuthCookieService.ACCESS_COOKIE, "access-token")))
                .andExpect(status().isNoContent())
                .andExpect(header().stringValues("Set-Cookie",
                        org.hamcrest.Matchers.hasItem(containsString("sfm_access=;"))))
                .andExpect(header().stringValues("Set-Cookie",
                        org.hamcrest.Matchers.hasItem(containsString("sfm_refresh=;"))));

        verify(authSessionService).revokeSession("refresh-token");
        verify(tokenBlacklistService).blacklist("access-jti", Duration.ofMinutes(5));
    }

    @Test
    void me_whenNoAuthentication_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void me_whenAuthenticated_returnsUserProfile() throws Exception {
        SystemUser user = activeAdmin();
        when(userDetailsService.loadUserByUsername("admin")).thenReturn(user);

        org.springframework.security.core.Authentication auth =
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());

        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);

        try {
            mockMvc.perform(get("/api/v1/auth/me"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(USER_ID.toString()))
                    .andExpect(jsonPath("$.username").value("admin"))
                    .andExpect(jsonPath("$.email").value("admin@sfm.local"))
                    .andExpect(jsonPath("$.role").value("ADMIN"))
                    .andExpect(jsonPath("$.active").value(true))
                    .andExpect(jsonPath("$.doctorId").value(nullValue()))
                    .andExpect(jsonPath("$.doctorFirstName").value(nullValue()))
                    .andExpect(jsonPath("$.doctorLastName").value(nullValue()));
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }
}
