package com.fepdev.sfm.backend.security;

import java.io.IOException;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

// Filtro de autenticacion JWT
@Component
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsServiceImpl userDetailsService;
    private final AuthCookieService authCookieService;
    private final TokenBlacklistService tokenBlacklistService;

    public JwtAuthenticationFilter(JwtService jwtService, UserDetailsServiceImpl userDetailsService,
            AuthCookieService authCookieService, TokenBlacklistService tokenBlacklistService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.authCookieService = authCookieService;
        this.tokenBlacklistService = tokenBlacklistService;
    }

    // Intercepta cada request, extrae el JWT de la cookie httpOnly (o del header
    // Authorization para clientes de API), valida el token y establece la
    // autenticacion en el contexto de seguridad.
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        final String jwt = extractToken(request);

        // Si no hay token, continuar sin autenticar; Spring Security decide despues
        if (jwt == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            final String username = jwtService.extractUsername(jwt);
            final String jti = jwtService.extractJti(jwt);

            // Un access token revocado en logout no debe autenticar aunque no haya expirado.
            if (jti != null && isBlacklisted(jti)) {
                filterChain.doFilter(request, response);
                return;
            }

            // Solo procesar si hay username y aun no hay autenticacion en el contexto
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                // Solo access tokens son validos para autenticar requests normales
                if (jwtService.isAccessTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (JwtException | UsernameNotFoundException e) {
            // Token invalido, expirado o usuario eliminado:
            // no establecer autenticacion y dejar que Spring Security retorne 401
        }

        // Continuar con el filtro
        filterChain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        final String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return authCookieService.readAccessToken(request);
    }

    /**
     * Redis no es critico para autenticar: si esta caido se falla abierto y el token
     * sigue validando por firma/expedicion. El costo es que un access token revocado
     * puede seguir vivo hasta 15 minutos durante una caida de Redis.
     */
    private boolean isBlacklisted(String jti) {
        try {
            return tokenBlacklistService.isBlacklisted(jti);
        } catch (RuntimeException ex) {
            log.warn("No se pudo consultar la blacklist en Redis; se continua sin ella: {}",
                    ex.getMessage());
            return false;
        }
    }
}
