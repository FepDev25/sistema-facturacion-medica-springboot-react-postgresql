package com.fepdev.sfm.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Defensa CSRF para la sesion en cookies.
 *
 * <p>Las cookies usan {@code SameSite=Strict} y, ademas, toda peticion mutante debe
 * traer un {@code Origin} (o {@code Referer}) permitido. Las peticiones sin cabeceras
 * de navegador (curl, health checks, clientes de API) se dejan pasar: no transportan
 * cookies de forma implicita como un formulario cross-site.</p>
 */
public class OriginValidationFilter extends OncePerRequestFilter {

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    private final Set<String> allowedOrigins;

    public OriginValidationFilter(Set<String> allowedOrigins) {
        this.allowedOrigins = Set.copyOf(allowedOrigins);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        if (SAFE_METHODS.contains(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String origin = request.getHeader("Origin");
        if (origin == null || origin.isBlank()) {
            origin = originFromReferer(request.getHeader("Referer"));
        }

        if (origin != null && !origin.isBlank() && !isAllowed(origin, request)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("""
                    {"status":403,"error":"Forbidden","message":"Origen no permitido.","path":"%s"}""".formatted(request.getRequestURI()));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isAllowed(String origin, HttpServletRequest request) {
        if (allowedOrigins.contains(origin)) {
            return true;
        }

        // Same-origin (por ejemplo Swagger UI servido por el propio backend) no es
        // CSRF. Detras de un proxy se usa X-Forwarded-Proto para reconstruir el origen.
        String forwardedProto = request.getHeader("X-Forwarded-Proto");
        String scheme = forwardedProto != null && !forwardedProto.isBlank()
                ? forwardedProto.split(",")[0].trim()
                : request.getScheme();
        String host = request.getHeader("Host");
        return host != null && origin.equalsIgnoreCase(scheme + "://" + host);
    }

    private String originFromReferer(String referer) {
        if (referer == null || referer.isBlank()) {
            return null;
        }
        try {
            java.net.URI uri = java.net.URI.create(referer);
            if (uri.getScheme() == null || uri.getHost() == null) {
                return null;
            }
            int port = uri.getPort();
            boolean defaultPort = port == -1
                    || ("https".equalsIgnoreCase(uri.getScheme()) && port == 443)
                    || ("http".equalsIgnoreCase(uri.getScheme()) && port == 80);
            return uri.getScheme() + "://" + uri.getHost() + (defaultPort ? "" : ":" + port);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
