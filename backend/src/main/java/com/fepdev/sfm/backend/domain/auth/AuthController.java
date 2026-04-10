package com.fepdev.sfm.backend.domain.auth;

import java.time.Duration;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fepdev.sfm.backend.domain.auth.dto.LoginRequest;
import com.fepdev.sfm.backend.domain.auth.dto.LogoutRequest;
import com.fepdev.sfm.backend.domain.auth.dto.RefreshTokenRequest;
import com.fepdev.sfm.backend.domain.auth.dto.TokenResponse;
import com.fepdev.sfm.backend.domain.auth.dto.UserProfileResponse;
import com.fepdev.sfm.backend.security.JwtService;
import com.fepdev.sfm.backend.security.SystemUser;
import com.fepdev.sfm.backend.security.TokenBlacklistService;
import com.fepdev.sfm.backend.security.UserDetailsServiceImpl;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import io.jsonwebtoken.JwtException;
import jakarta.validation.Valid;

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

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        SystemUser user = (SystemUser) userDetailsService.loadUserByUsername(request.username());

        String accessToken  = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        return ResponseEntity.ok(TokenResponse.login(accessToken, refreshToken, user.getRole().name(),
                user.getId(), user.getUsername()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        final String token = request.refreshToken();

        try {
            String jti = jwtService.extractJti(token);
            if (tokenBlacklistService.isBlacklisted(jti)) {
                throw new BusinessRuleException("El refresh token es invalido o ha expirado");
            }

            final String username = jwtService.extractUsername(token);
            SystemUser user = (SystemUser) userDetailsService.loadUserByUsername(username);

            if (!jwtService.isRefreshTokenValid(token, user)) {
                throw new BusinessRuleException("El refresh token es invalido o ha expirado");
            }

            String newAccessToken = jwtService.generateAccessToken(user);
            return ResponseEntity.ok(TokenResponse.refresh(newAccessToken, user.getRole().name(),
                    user.getId(), user.getUsername()));

        } catch (JwtException e) {
            throw new BusinessRuleException("El refresh token es invalido o ha expirado");
        }
    }

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
        }

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
}
