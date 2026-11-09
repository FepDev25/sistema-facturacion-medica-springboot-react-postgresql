package com.fepdev.sfm.backend.domain.auth;

import java.time.Duration;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fepdev.sfm.backend.domain.auth.dto.LoginRequest;
import com.fepdev.sfm.backend.domain.auth.dto.SessionResponse;
import com.fepdev.sfm.backend.domain.auth.dto.UserProfileResponse;
import com.fepdev.sfm.backend.domain.auth.token.AuthSessionService;
import com.fepdev.sfm.backend.domain.auth.token.InvalidRefreshTokenException;
import com.fepdev.sfm.backend.domain.auth.token.SessionTokens;
import com.fepdev.sfm.backend.security.AuthCookieService;
import com.fepdev.sfm.backend.security.JwtService;
import com.fepdev.sfm.backend.security.LoginAttemptService;
import com.fepdev.sfm.backend.security.SystemUser;
import com.fepdev.sfm.backend.security.TokenBlacklistService;
import com.fepdev.sfm.backend.security.UserDetailsServiceImpl;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserDetailsServiceImpl userDetailsService;
    private final TokenBlacklistService tokenBlacklistService;
    private final AuthSessionService authSessionService;
    private final AuthCookieService authCookieService;
    private final LoginAttemptService loginAttemptService;

    public AuthController(AuthenticationManager authenticationManager,
            JwtService jwtService,
            UserDetailsServiceImpl userDetailsService,
            TokenBlacklistService tokenBlacklistService,
            AuthSessionService authSessionService,
            AuthCookieService authCookieService,
            LoginAttemptService loginAttemptService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.tokenBlacklistService = tokenBlacklistService;
        this.authSessionService = authSessionService;
        this.authCookieService = authCookieService;
        this.loginAttemptService = loginAttemptService;
    }

    @PostMapping("/login")
    public ResponseEntity<SessionResponse> login(@Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest, HttpServletResponse response) {

        String ip = clientIp(httpRequest);
        loginAttemptService.checkAllowed(ip, request.username());

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username(), request.password()));
        } catch (AuthenticationException ex) {
            loginAttemptService.recordFailure(ip, request.username());
            throw ex;
        }

        SystemUser user = (SystemUser) userDetailsService.loadUserByUsername(request.username());
        loginAttemptService.recordSuccess(ip, request.username());

        SessionTokens tokens = authSessionService.startSession(user);
        authCookieService.writeSession(response, tokens.accessToken(), tokens.refreshToken());

        return ResponseEntity.ok(SessionResponse.from(tokens));
    }

    @PostMapping("/refresh")
    public ResponseEntity<SessionResponse> refresh(
            @CookieValue(name = AuthCookieService.REFRESH_COOKIE, required = false) String refreshToken,
            HttpServletResponse response) {

        if (refreshToken == null || refreshToken.isBlank()) {
            throw new InvalidRefreshTokenException();
        }

        try {
            String username = jwtService.extractUsername(refreshToken);
            SystemUser user = (SystemUser) userDetailsService.loadUserByUsername(username);

            SessionTokens tokens = authSessionService.rotate(refreshToken, user);
            authCookieService.writeSession(response, tokens.accessToken(), tokens.refreshToken());

            return ResponseEntity.ok(SessionResponse.from(tokens));
        } catch (InvalidRefreshTokenException ex) {
            authCookieService.clearSession(response);
            throw ex;
        } catch (JwtException | IllegalArgumentException | AuthenticationException ex) {
            authCookieService.clearSession(response);
            throw new InvalidRefreshTokenException();
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = AuthCookieService.REFRESH_COOKIE, required = false) String refreshToken,
            HttpServletRequest request, HttpServletResponse response) {

        try {
            authSessionService.revokeSession(refreshToken);
        } catch (RuntimeException ignored) {
            // Si la BD no responde, el logout local igual limpia cookies; la familia
            // quedara revocada cuando el refresh token expire.
        }
        blacklistCurrentAccessToken(request);

        authCookieService.clearSession(response);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(401).build();
        }

        SystemUser user = (SystemUser) userDetailsService.loadUserByUsername(auth.getName());
        return ResponseEntity.ok(UserProfileResponse.from(user));
    }

    private void blacklistCurrentAccessToken(HttpServletRequest request) {
        String accessToken = authCookieService.readAccessToken(request);
        if (accessToken == null) {
            String header = request.getHeader("Authorization");
            if (header != null && header.startsWith("Bearer ")) {
                accessToken = header.substring(7);
            }
        }
        if (accessToken == null) {
            return;
        }

        try {
            String jti = jwtService.extractJti(accessToken);
            Duration remaining = jwtService.getRemainingTtl(accessToken);
            tokenBlacklistService.blacklist(jti, remaining);
        } catch (JwtException | IllegalArgumentException ignored) {
            // Token ya vencido o ilegible: las cookies se limpian igual.
        } catch (RuntimeException ex) {
            // Redis caido: el logout local igual limpia cookies; el token expira solo.
        }
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // El ultimo valor lo agrega el proxy mas cercano (Heroku/Vercel); los
            // anteriores podrian venir inyectados por el cliente.
            String[] parts = forwarded.split(",");
            return parts[parts.length - 1].trim();
        }
        return request.getRemoteAddr();
    }
}
