package com.fepdev.sfm.backend.domain.auth;

import java.time.Duration;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fepdev.sfm.backend.domain.auth.dto.LoginRequest;
import com.fepdev.sfm.backend.domain.auth.dto.LogoutRequest;
import com.fepdev.sfm.backend.domain.auth.dto.RefreshTokenRequest;
import com.fepdev.sfm.backend.domain.auth.dto.TokenResponse;
import com.fepdev.sfm.backend.security.JwtService;
import com.fepdev.sfm.backend.security.SystemUser;
import com.fepdev.sfm.backend.security.TokenBlacklistService;
import com.fepdev.sfm.backend.security.UserDetailsServiceImpl;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import io.jsonwebtoken.JwtException;
import jakarta.validation.Valid;

// controlador de autenticacion: login y refresh token
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserDetailsServiceImpl userDetailsService;
    private final TokenBlacklistService tokenBlacklistService;

    public AuthController(AuthenticationManager authenticationManager,
            JwtService jwtService,
            UserDetailsServiceImpl userDetailsService,
            TokenBlacklistService tokenBlacklistService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.tokenBlacklistService = tokenBlacklistService;
    }

    
    // Login: autentica credenciales y devuelve access + refresh token.
    // Errores de credenciales son manejados por HandlerException via AuthenticationException → 401.
    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        // AuthenticationManager valida username y password contra la BD.
        // Si falla lanza AuthenticationException - HandlerException - 401
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        SystemUser user = (SystemUser) userDetailsService.loadUserByUsername(request.username());

        String accessToken  = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        return ResponseEntity.ok(TokenResponse.login(accessToken, refreshToken, user.getRole().name()));
    }

    
    // Refresh: valida el refresh token y emite un nuevo access token.
    // No emite un nuevo refresh token, el cliente debe re-autenticarse cuando el refresh expire.
    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        final String token = request.refreshToken();

        try {
            final String username = jwtService.extractUsername(token);
            SystemUser user = (SystemUser) userDetailsService.loadUserByUsername(username);

            if (!jwtService.isRefreshTokenValid(token, user)) {
                throw new BusinessRuleException("El refresh token es invalido o ha expirado");
            }

            String newAccessToken = jwtService.generateAccessToken(user);
            return ResponseEntity.ok(TokenResponse.refresh(newAccessToken, user.getRole().name()));

        } catch (JwtException e) {
            throw new BusinessRuleException("El refresh token es invalido o ha expirado");
        }
    }

    // Logout: revoca el refresh token agregando su jti a la blacklist de Redis.
    // El access token expira naturalmente (15 min), riesgo aceptable.
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody LogoutRequest request) {
        final String token = request.refreshToken();

        try {
            final String username = jwtService.extractUsername(token);
            SystemUser user = (SystemUser) userDetailsService.loadUserByUsername(username);

            if (!jwtService.isRefreshTokenValid(token, user)) {
                throw new BusinessRuleException("El refresh token es invalido o ha expirado");
            }

            String jti = jwtService.extractJti(token);
            Duration remainingTtl = jwtService.getRemainingTtl(token);
            tokenBlacklistService.blacklist(jti, remainingTtl);

        } catch (JwtException e) {
            // Token invalido o expirado: no hace falta blacklistearlo, el logout es efectivo
        }

        return ResponseEntity.noContent().build();
    }
}
