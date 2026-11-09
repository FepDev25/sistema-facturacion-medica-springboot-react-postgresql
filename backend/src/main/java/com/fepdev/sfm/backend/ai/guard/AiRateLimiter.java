package com.fepdev.sfm.backend.ai.guard;

import java.time.Clock;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// Limite simple de ventana fija por usuario. La app corre en un solo dyno, asi que
// un contador en memoria es suficiente; si se escala horizontalmente hay que moverlo
// a Redis (Upstash ya esta disponible en produccion).
@Component
public class AiRateLimiter {

    private static final int MAX_TRACKED_USERS = 10_000;

    private record Window(long minute, AtomicInteger count) {}

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final int requestsPerMinute;
    private final Clock clock;

    public AiRateLimiter(
            @Value("${app.ai.rate-limit.requests-per-minute:20}") int requestsPerMinute,
            Clock clock) {
        this.requestsPerMinute = requestsPerMinute;
        this.clock = clock;
    }

    public void check(String user) {
        String key = user == null || user.isBlank() ? "anonymous" : user;
        long currentMinute = clock.millis() / 60_000;

        Window window = windows.compute(key, (ignored, existing) ->
                existing == null || existing.minute() != currentMinute
                        ? new Window(currentMinute, new AtomicInteger())
                        : existing);

        if (window.count().incrementAndGet() > requestsPerMinute) {
            throw new AiRateLimitExceededException(
                    "Has alcanzado el limite de " + requestsPerMinute
                            + " solicitudes de IA por minuto. Intenta de nuevo en un momento.");
        }

        if (windows.size() > MAX_TRACKED_USERS) {
            windows.entrySet().removeIf(entry -> entry.getValue().minute() != currentMinute);
        }
    }

    public int getRequestsPerMinute() {
        return requestsPerMinute;
    }
}
