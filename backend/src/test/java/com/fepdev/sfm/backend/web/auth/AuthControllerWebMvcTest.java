package com.fepdev.sfm.backend.web.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.nullValue;

import java.time.Duration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fepdev.sfm.backend.domain.auth.AuthController;
import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;
import com.fepdev.sfm.backend.security.JwtService;
import com.fepdev.sfm.backend.security.Role;
import com.fepdev.sfm.backend.security.SystemUser;
import com.fepdev.sfm.backend.security.TokenBlacklistService;
import com.fepdev.sfm.backend.security.UserDetailsServiceImpl;
import com.fepdev.sfm.backend.shared.exception.HandlerException;

import io.jsonwebtoken.JwtException;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(HandlerException.class)
class AuthControllerWebMvcTest {

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
    JwtAuthenticationFilter jwtAuthenticationFilter;

    private SystemUser activeAdmin() {
        SystemUser user = new SystemUser();
        ReflectionTestUtils.setField(user, "username", "admin");
        ReflectionTestUtils.setField(user, "passwordHash", "x");
        ReflectionTestUtils.setField(user, "role", Role.ADMIN);
        ReflectionTestUtils.setField(user, "active", true);
        return user;
    }

    @Test
    void login_whenValidRequest_returns200() throws Exception {
        SystemUser user = activeAdmin();

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("admin", "pwd"));
        when(userDetailsService.loadUserByUsername("admin")).thenReturn(user);
        when(jwtService.generateAccessToken(user)).thenReturn("access-token");
        when(jwtService.generateRefreshToken(user)).thenReturn("refresh-token");

        String body = """
                {
                  "username": "admin",
                  "password": "123456"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/login").contentType("application/json").content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.refreshToken").value("refresh-token"));
    }

    @Test
    void login_whenInvalidCredentials_returns401() throws Exception {
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
    }

    @Test
    void refresh_whenInvalidRequest_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh").contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void refresh_whenValidToken_returns200() throws Exception {
        SystemUser user = activeAdmin();

        when(jwtService.extractJti("refresh-token")).thenReturn("jti-123");
        when(tokenBlacklistService.isBlacklisted("jti-123")).thenReturn(false);
        when(jwtService.extractUsername("refresh-token")).thenReturn("admin");
        when(userDetailsService.loadUserByUsername("admin")).thenReturn(user);
        when(jwtService.isRefreshTokenValid("refresh-token", user)).thenReturn(true);
        when(jwtService.generateAccessToken(user)).thenReturn("new-access-token");

        String body = """
                {
                  "refreshToken": "refresh-token"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/refresh").contentType("application/json").content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("new-access-token"))
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.refreshToken").value(nullValue()));
    }

    @Test
    void refresh_whenTokenIsBlacklisted_returns422() throws Exception {
        when(jwtService.extractJti("refresh-token")).thenReturn("jti-123");
        when(tokenBlacklistService.isBlacklisted("jti-123")).thenReturn(true);

        String body = """
                {
                  "refreshToken": "refresh-token"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/refresh").contentType("application/json").content(body))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.status").value(422));
    }

    @Test
    void refresh_whenTokenMalformed_returns422() throws Exception {
        when(jwtService.extractJti("refresh-token")).thenReturn("jti-123");
        when(tokenBlacklistService.isBlacklisted("jti-123")).thenReturn(false);
        when(jwtService.extractUsername("refresh-token")).thenThrow(new JwtException("Malformed"));

        String body = """
                {
                  "refreshToken": "refresh-token"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/refresh").contentType("application/json").content(body))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.status").value(422));
    }

    @Test
    void refresh_whenTokenValidationFails_returns422() throws Exception {
        SystemUser user = activeAdmin();

        when(jwtService.extractJti("refresh-token")).thenReturn("jti-123");
        when(tokenBlacklistService.isBlacklisted("jti-123")).thenReturn(false);
        when(jwtService.extractUsername("refresh-token")).thenReturn("admin");
        when(userDetailsService.loadUserByUsername("admin")).thenReturn(user);
        when(jwtService.isRefreshTokenValid("refresh-token", user)).thenReturn(false);

        String body = """
                {
                  "refreshToken": "refresh-token"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/refresh").contentType("application/json").content(body))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.status").value(422));
    }

    @Test
    void logout_whenValidRefreshToken_returns204() throws Exception {
        SystemUser user = activeAdmin();

        when(jwtService.extractUsername("refresh-token")).thenReturn("admin");
        when(userDetailsService.loadUserByUsername("admin")).thenReturn(user);
        when(jwtService.isRefreshTokenValid("refresh-token", user)).thenReturn(true);
        when(jwtService.extractJti("refresh-token")).thenReturn("jti-123");
        when(jwtService.getRemainingTtl("refresh-token")).thenReturn(Duration.ofMinutes(5));

        String body = """
                {
                  "refreshToken": "refresh-token"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/logout").contentType("application/json").content(body))
                .andExpect(status().isNoContent());

        verify(tokenBlacklistService).blacklist("jti-123", Duration.ofMinutes(5));
    }

    @Test
    void logout_whenTokenIsInvalid_returns204AndDoesNotBlacklist() throws Exception {
        when(jwtService.extractUsername("refresh-token")).thenThrow(new JwtException("Expired"));

        String body = """
                {
                  "refreshToken": "refresh-token"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/logout").contentType("application/json").content(body))
                .andExpect(status().isNoContent());

        verify(tokenBlacklistService, never()).blacklist(any(), any());
    }
}
