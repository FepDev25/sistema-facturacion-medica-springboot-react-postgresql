package com.fepdev.sfm.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;
import com.fepdev.sfm.backend.security.OriginValidationFilter;

// Configuracion de seguridad de Spring Security
@SuppressWarnings("unused")
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:4173}")
    private String allowedOriginsConfig;

    // Configura las reglas de seguridad HTTP, establece la politica de sesiones a
    // stateless y agrega el filtro de autenticacion JWT. La sesion viaja en cookies
    // httpOnly SameSite=Strict, por lo que la proteccion CSRF se complementa con
    // OriginValidationFilter (verificacion de Origin/Referer en metodos mutantes).
    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter)
            throws Exception {
        return http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth

                        // Preflight CORS
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Publicos
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/error").permitAll()
                        .requestMatchers(
                                "/swagger-ui/**", "/swagger-ui.html",
                                "/api-docs/**", "/v3/api-docs/**").permitAll()

                        // Usuarios del sistema — solo ADMIN puede listar
                        .requestMatchers(HttpMethod.GET,   "/api/v1/system-users").hasAuthority("ADMIN")

                        // Catalogos — solo ADMIN escribe
                        .requestMatchers(HttpMethod.POST,   "/api/v1/catalog/**").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PUT,    "/api/v1/catalog/**").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/catalog/**").hasAuthority("ADMIN")

                        // Medicos — solo ADMIN escribe
                        .requestMatchers(HttpMethod.POST,   "/api/v1/doctors").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PUT,    "/api/v1/doctors/**").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/doctors/**").hasAuthority("ADMIN")

                        // Seguros — solo ADMIN escribe
                        .requestMatchers(HttpMethod.POST,   "/api/v1/insurance/**").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PUT,    "/api/v1/insurance/**").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/insurance/**").hasAuthority("ADMIN")

                        // Pacientes — ADMIN y RECEPTIONIST escriben
                        .requestMatchers(HttpMethod.POST, "/api/v1/patients").hasAnyAuthority("ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.PUT,  "/api/v1/patients/**").hasAnyAuthority("ADMIN", "RECEPTIONIST")

                        // Citas — completar es exclusivo del DOCTOR
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/appointments/*/complete").hasAuthority("DOCTOR")

                        // Facturas — ADMIN y RECEPTIONIST consultan, solo ADMIN gestiona
                        .requestMatchers(HttpMethod.GET,    "/api/v1/invoices/**").hasAnyAuthority("ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.POST,   "/api/v1/invoices/**").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PATCH,  "/api/v1/invoices/**").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/invoices/**").hasAuthority("ADMIN")

                        // Pagos — ADMIN y RECEPTIONIST consultan y registran
                        .requestMatchers(HttpMethod.GET,  "/api/v1/payments/**").hasAnyAuthority("ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.POST, "/api/v1/payments").hasAnyAuthority("ADMIN", "RECEPTIONIST")

                        // Reparación del índice de historial — operación de mantenimiento
                        .requestMatchers(HttpMethod.POST, "/api/v1/ai/patients/*/reindex")
                                .hasAuthority("ADMIN")

                        // Sugerencia de items de factura — mismo alcance que las facturas
                        .requestMatchers(HttpMethod.POST, "/api/v1/ai/invoices/**")
                                .hasAnyAuthority("ADMIN", "RECEPTIONIST")

                        // Cualquier otro endpoint requiere autenticacion (cualquier rol)
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(allowedOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setExposedHeaders(List.of("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    // El filtro corre antes de Spring Security para que un POST cross-site no llegue
    // ni siquiera a evaluar la cookie de sesion.
    @Bean
    FilterRegistrationBean<OriginValidationFilter> originValidationFilter() {
        FilterRegistrationBean<OriginValidationFilter> registration =
                new FilterRegistrationBean<>(new OriginValidationFilter(Set.copyOf(allowedOrigins())));
        registration.addUrlPatterns("/api/*");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return registration;
    }

    private List<String> allowedOrigins() {
        return Arrays.stream(allowedOriginsConfig.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .collect(Collectors.toList());
    }

    // Bean para codificar contrasenas usando BCrypt
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // Bean para el AuthenticationManager, necesario para autenticar en el AuthController
    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }
}
