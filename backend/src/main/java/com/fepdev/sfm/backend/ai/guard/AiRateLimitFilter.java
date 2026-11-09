package com.fepdev.sfm.backend.ai.guard;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// Corre despues de Spring Security, por lo que el SecurityContext ya tiene el usuario
// autenticado. Se registra desde AiGuardConfig (no como @Component) para que los
// @WebMvcTest no tengan que mockear el rate limiter.
public class AiRateLimitFilter extends OncePerRequestFilter {

    private static final String AI_PREFIX = "/api/v1/ai/";

    private final AiRateLimiter rateLimiter;

    public AiRateLimitFilter(AiRateLimiter rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith(AI_PREFIX);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String user = auth != null && auth.isAuthenticated() ? auth.getName() : "anonymous";

        try {
            rateLimiter.check(user);
        } catch (AiRateLimitExceededException ex) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("""
                    {"status":429,"error":"Too Many Requests","message":"%s","path":"%s"}"""
                    .formatted(ex.getMessage().replace("\"", "'"), request.getRequestURI()));
            return;
        }

        filterChain.doFilter(request, response);
    }
}
