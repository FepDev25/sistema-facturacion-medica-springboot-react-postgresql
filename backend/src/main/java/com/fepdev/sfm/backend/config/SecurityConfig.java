package com.fepdev.sfm.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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

import java.util.List;

import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;

// Configuracion de seguridad de Spring Security
@SuppressWarnings("unused")
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    // Configura las reglas de seguridad HTTP, deshabilita CSRF, establece la politica de 
    // sesiones a stateless y agrega el filtro de autenticacion JWT.
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

                        // Pagos — ADMIN y RECEPTIONIST registran
                        .requestMatchers(HttpMethod.POST, "/api/v1/payments").hasAnyAuthority("ADMIN", "RECEPTIONIST")

                        // Cualquier otro endpoint requiere autenticacion (cualquier rol)
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:4173",
                "http://127.0.0.1:4173"
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setExposedHeaders(List.of("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
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
