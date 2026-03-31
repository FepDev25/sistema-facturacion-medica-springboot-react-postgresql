package com.fepdev.sfm.backend.security;

import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import java.util.function.Function;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

// Servicio para generar y validar JWTs de acceso y refresh tokens.
@Service
public class JwtService {

    private static final String CLAIM_TYPE  = "type";
    private static final String TYPE_ACCESS  = "access";
    private static final String TYPE_REFRESH = "refresh";

    // obtener desde el archivo de configuracion
    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.access-token-expiration}")
    private long accessTokenExpiration;

    @Value("${app.jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    // Generacion

    public String generateAccessToken(UserDetails userDetails) {
        return buildToken(userDetails, accessTokenExpiration, TYPE_ACCESS);
    }

    public String generateRefreshToken(UserDetails userDetails) {
        return buildToken(userDetails, refreshTokenExpiration, TYPE_REFRESH);
    }

    // Genera un token con el username como subject, el rol del usuario,
    // un claim "type" para distinguir access vs refresh tokens, y un jti unico.
    private String buildToken(UserDetails userDetails, long expirationMs, String tokenType) {
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(userDetails.getUsername())
                .claim(CLAIM_TYPE, tokenType)
                .claim("role", userDetails.getAuthorities().iterator().next().getAuthority())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSignKey())
                .compact();
    }

    // Validacion

    public boolean isAccessTokenValid(String token, UserDetails userDetails) {
        return isTokenValid(token, userDetails) && TYPE_ACCESS.equals(extractType(token));
    }

    public boolean isRefreshTokenValid(String token, UserDetails userDetails) {
        return isTokenValid(token, userDetails) && TYPE_REFRESH.equals(extractType(token));
    }

    // Valida que el token sea valido (username coincide y no ha expirado)
    private boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    // Extraccion de claims

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String extractJti(String token) {
        return extractClaim(token, Claims::getId);
    }

    public Duration getRemainingTtl(String token) {
        Date expiration = extractExpiration(token);
        Duration remaining = Duration.between(Instant.now(), expiration.toInstant());
        return remaining.isNegative() ? Duration.ZERO : remaining;
    }

    private String extractType(String token) {
        return extractClaim(token, claims -> claims.get(CLAIM_TYPE, String.class));
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    // Parsea el token y retorna todos sus claims.
    // Lanza JwtException si el token es invalido, esta malformado o ha expirado.
    private Claims extractAllClaims(String token) throws JwtException {
        return Jwts.parser()
                .verifyWith(getSignKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    // Obtiene la clave de firma a partir del secreto configurado
    private SecretKey getSignKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
