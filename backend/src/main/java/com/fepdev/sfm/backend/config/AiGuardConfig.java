package com.fepdev.sfm.backend.config;

import com.fepdev.sfm.backend.ai.guard.AiRateLimitFilter;
import com.fepdev.sfm.backend.ai.guard.AiRateLimiter;
import com.fepdev.sfm.backend.ai.guard.FallbackRateLimitStore;
import com.fepdev.sfm.backend.ai.guard.InMemoryRateLimitStore;
import com.fepdev.sfm.backend.ai.guard.RateLimitStore;
import com.fepdev.sfm.backend.ai.guard.RedisRateLimitStore;
import java.time.Clock;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.data.redis.core.StringRedisTemplate;

@Configuration
public class AiGuardConfig {

    // Contador compartido en Redis con degradacion a memoria si Upstash no responde.
    // `app.rate-limit.distributed=false` permite correr tests/integración sin Redis.
    @Bean
    RateLimitStore rateLimitStore(
            StringRedisTemplate redisTemplate,
            Clock clock,
            @org.springframework.beans.factory.annotation.Value("${app.rate-limit.distributed:true}")
                    boolean distributed) {
        InMemoryRateLimitStore memory = new InMemoryRateLimitStore(clock);
        if (!distributed) {
            return memory;
        }
        return new FallbackRateLimitStore(new RedisRateLimitStore(redisTemplate), memory);
    }

    @Bean
    FilterRegistrationBean<AiRateLimitFilter> aiRateLimitFilter(AiRateLimiter rateLimiter) {
        FilterRegistrationBean<AiRateLimitFilter> registration =
                new FilterRegistrationBean<>(new AiRateLimitFilter(rateLimiter));
        registration.addUrlPatterns("/api/v1/ai/*");
        registration.setOrder(Ordered.LOWEST_PRECEDENCE);
        return registration;
    }
}
