package com.fepdev.sfm.backend.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

import com.fepdev.sfm.backend.ai.guard.AiRateLimitFilter;
import com.fepdev.sfm.backend.ai.guard.AiRateLimiter;

@Configuration
public class AiGuardConfig {

    @Bean
    FilterRegistrationBean<AiRateLimitFilter> aiRateLimitFilter(AiRateLimiter rateLimiter) {
        FilterRegistrationBean<AiRateLimitFilter> registration =
                new FilterRegistrationBean<>(new AiRateLimitFilter(rateLimiter));
        registration.addUrlPatterns("/api/v1/ai/*");
        registration.setOrder(Ordered.LOWEST_PRECEDENCE);
        return registration;
    }
}
