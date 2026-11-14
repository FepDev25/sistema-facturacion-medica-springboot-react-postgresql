package com.fepdev.sfm.backend.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * Emite y limpia las cookies de sesion.
 *
 * <p>Los tokens viven en cookies {@code httpOnly}: JavaScript no puede leerlos, por lo
 * que un XSS no puede exfiltrar la sesion. El refresh token solo se envia al prefijo
 * {@code /api/v1/auth}, reduciendo su superficie de exposicion.</p>
 */
@Component
public class AuthCookieService {

    public static final String ACCESS_COOKIE = "sfm_access";
    public static final String REFRESH_COOKIE = "sfm_refresh";

    private static final String ACCESS_PATH = "/api";
    private static final String REFRESH_PATH = "/api/v1/auth";

    private final boolean secure;
    private final String sameSite;
    private final Duration accessMaxAge;
    private final Duration refreshMaxAge;

    public AuthCookieService(
            @Value("${app.auth.cookies.secure:false}") boolean secure,
            @Value("${app.auth.cookies.same-site:Strict}") String sameSite,
            @Value("${app.jwt.access-token-expiration}") long accessTokenExpirationMs,
            @Value("${app.jwt.refresh-token-expiration}") long refreshTokenExpirationMs) {
        this.secure = secure;
        this.sameSite = sameSite;
        this.accessMaxAge = Duration.ofMillis(accessTokenExpirationMs);
        this.refreshMaxAge = Duration.ofMillis(refreshTokenExpirationMs);
    }

    public void writeSession(HttpServletResponse response, String accessToken, String refreshToken) {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        response.addHeader(
                HttpHeaders.SET_COOKIE,
                build(ACCESS_COOKIE, accessToken, ACCESS_PATH, accessMaxAge).toString());
        response.addHeader(
                HttpHeaders.SET_COOKIE,
                build(REFRESH_COOKIE, refreshToken, REFRESH_PATH, refreshMaxAge).toString());
    }

    public void clearSession(HttpServletResponse response) {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        response.addHeader(
                HttpHeaders.SET_COOKIE,
                build(ACCESS_COOKIE, "", ACCESS_PATH, Duration.ZERO).toString());
        response.addHeader(
                HttpHeaders.SET_COOKIE,
                build(REFRESH_COOKIE, "", REFRESH_PATH, Duration.ZERO).toString());
    }

    public String readRefreshToken(HttpServletRequest request) {
        return readCookie(request, REFRESH_COOKIE);
    }

    public String readAccessToken(HttpServletRequest request) {
        return readCookie(request, ACCESS_COOKIE);
    }

    private ResponseCookie build(String name, String value, String path, Duration maxAge) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path(path)
                .maxAge(maxAge)
                .build();
    }

    private String readCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                String value = cookie.getValue();
                return value == null || value.isBlank() ? null : value;
            }
        }
        return null;
    }
}
