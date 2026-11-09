package com.fepdev.sfm.backend.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClockConfig {

    // Reloj inyectable: permite fijar "hoy" en tests y centraliza la zona horaria.
    @Bean
    Clock clock() {
        return Clock.systemDefaultZone();
    }
}
