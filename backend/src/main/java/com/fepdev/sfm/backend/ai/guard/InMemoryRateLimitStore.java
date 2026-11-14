package com.fepdev.sfm.backend.ai.guard;

import java.time.Clock;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

// Contador local con expiracion perezosa. Se usa en tests y como fallback cuando
// Redis no esta disponible.
public class InMemoryRateLimitStore implements RateLimitStore {

    private static final int MAX_TRACKED_KEYS = 50_000;

    private record Counter(AtomicLong value, long expiresAtMillis) {}

    private final ConcurrentHashMap<String, Counter> counters = new ConcurrentHashMap<>();
    private final Clock clock;

    public InMemoryRateLimitStore(Clock clock) {
        this.clock = clock;
    }

    @Override
    public long incrementAndGet(String key, Duration ttl) {
        long now = clock.millis();
        Counter counter = counters.compute(key, (ignored, existing) -> {
            if (existing == null || existing.expiresAtMillis() <= now) {
                return new Counter(new AtomicLong(1), now + ttl.toMillis());
            }
            existing.value().incrementAndGet();
            return existing;
        });

        if (counters.size() > MAX_TRACKED_KEYS) {
            counters.entrySet().removeIf(entry -> entry.getValue().expiresAtMillis() <= now);
        }
        return counter.value().get();
    }

    @Override
    public long current(String key) {
        Counter counter = counters.get(key);
        if (counter == null || counter.expiresAtMillis() <= clock.millis()) {
            return 0L;
        }
        return counter.value().get();
    }

    @Override
    public void reset(String key) {
        counters.remove(key);
    }
}
