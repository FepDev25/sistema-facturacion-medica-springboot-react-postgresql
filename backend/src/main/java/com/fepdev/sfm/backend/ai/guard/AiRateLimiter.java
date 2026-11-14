package com.fepdev.sfm.backend.ai.guard;

import java.time.Clock;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// Limite de ventana fija por usuario. El contador vive en Redis para que el limite
// sea compartido entre dynos; si Redis no responde, FallbackRateLimitStore degrada
// a un contador en memoria. La clave incluye el minuto, de modo que la ventana se
// renueva aunque el TTL tarde en expirar.
@Component
public class AiRateLimiter {

    private static final String KEY_PREFIX = "sfm:ai:rate:";
    private static final long WINDOW_MILLIS = 60_000L;

    private final int requestsPerMinute;
    private final Clock clock;
    private final RateLimitStore store;

    @Autowired
    public AiRateLimiter(
            @Value("${app.ai.rate-limit.requests-per-minute:20}") int requestsPerMinute,
            Clock clock,
            RateLimitStore store) {
        this.requestsPerMinute = requestsPerMinute;
        this.clock = clock;
        this.store = store;
    }

    // Constructor de conveniencia para tests unitarios y usos embebidos.
    public AiRateLimiter(int requestsPerMinute, Clock clock) {
        this(requestsPerMinute, clock, new InMemoryRateLimitStore(clock));
    }

    public void check(String user) {
        String key = user == null || user.isBlank() ? "anonymous" : user;
        long now = clock.millis();
        long currentMinute = now / WINDOW_MILLIS;
        Duration ttl = Duration.ofMillis(WINDOW_MILLIS - (now % WINDOW_MILLIS));

        long count = store.incrementAndGet(KEY_PREFIX + key + ":" + currentMinute, ttl);
        if (count > requestsPerMinute) {
            throw new AiRateLimitExceededException(
                    "Has alcanzado el limite de " + requestsPerMinute
                            + " solicitudes de IA por minuto. Intenta de nuevo en un momento.",
                    secondsUntilNextWindow(now));
        }
    }

    public int getRequestsPerMinute() {
        return requestsPerMinute;
    }

    public boolean isDistributed() {
        return store.isDistributed();
    }

    private static long secondsUntilNextWindow(long now) {
        long remaining = WINDOW_MILLIS - (now % WINDOW_MILLIS);
        return (remaining + 999) / 1000;
    }
}
