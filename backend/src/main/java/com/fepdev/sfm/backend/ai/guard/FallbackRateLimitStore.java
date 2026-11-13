package com.fepdev.sfm.backend.ai.guard;

import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

// Si Redis falla (timeout, conexion rechazada), el contador continua en memoria y la
// aplicacion sigue respondiendo. El fallback es por instancia, por eso no debe usarse
// como garantia global mientras Redis este caido.
public class FallbackRateLimitStore implements RateLimitStore {

    private static final Logger log = LoggerFactory.getLogger(FallbackRateLimitStore.class);

    private final RateLimitStore primary;
    private final RateLimitStore fallback;

    public FallbackRateLimitStore(RateLimitStore primary, RateLimitStore fallback) {
        this.primary = primary;
        this.fallback = fallback;
    }

    @Override
    public long incrementAndGet(String key, Duration ttl) {
        try {
            return primary.incrementAndGet(key, ttl);
        } catch (RuntimeException ex) {
            log.warn("Rate limit distribuido no disponible; usando memoria: {}", ex.getMessage());
            return fallback.incrementAndGet(key, ttl);
        }
    }

    @Override
    public long current(String key) {
        try {
            return primary.current(key);
        } catch (RuntimeException ex) {
            return fallback.current(key);
        }
    }

    @Override
    public void reset(String key) {
        try {
            primary.reset(key);
        } catch (RuntimeException ex) {
            log.debug("No se pudo limpiar la clave {} en Redis: {}", key, ex.getMessage());
        }
        fallback.reset(key);
    }

    @Override
    public boolean isDistributed() {
        return primary.isDistributed();
    }
}
