package com.fepdev.sfm.backend.ai.guard;

import java.time.Duration;

// Contador de ventana fija con expiracion. La implementacion distribuida vive en
// Redis; si Redis falla, FallbackRateLimitStore degrada a memoria para no tumbar
// el login ni los endpoints de IA.
public interface RateLimitStore {

    long incrementAndGet(String key, Duration ttl);

    long current(String key);

    void reset(String key);

    default boolean isDistributed() {
        return false;
    }
}
