package com.fepdev.sfm.backend.security;

import com.fepdev.sfm.backend.ai.guard.InMemoryRateLimitStore;
import com.fepdev.sfm.backend.ai.guard.RateLimitStore;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Clock;
import java.time.Duration;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Limita intentos fallidos de login por identidad (IP + usuario) y por IP.
 *
 * <p>Los contadores viven en Redis (compartidos entre dynos) y degradan a memoria
 * si el almacenamiento distribuido falla. Las claves incluyen la ventana temporal,
 * por lo que la ventana se renueva aunque el TTL tarde en expirar.</p>
 */
@Service
public class LoginAttemptService {

    private static final String KEY_PREFIX = "sfm:auth:login:";

    private final Clock clock;
    private final MeterRegistry meterRegistry;
    private final RateLimitStore store;
    private final int maxAttempts;
    private final int maxAttemptsPerIp;
    private final long windowMillis;

    @Autowired
    public LoginAttemptService(
            Clock clock,
            MeterRegistry meterRegistry,
            RateLimitStore store,
            @Value("${app.auth.login.max-attempts:10}") int maxAttempts,
            @Value("${app.auth.login.max-attempts-per-ip:30}") int maxAttemptsPerIp,
            @Value("${app.auth.login.window-seconds:300}") long windowSeconds) {
        this.clock = clock;
        this.meterRegistry = meterRegistry;
        this.store = store;
        this.maxAttempts = maxAttempts;
        this.maxAttemptsPerIp = maxAttemptsPerIp;
        this.windowMillis = Math.max(1, windowSeconds) * 1000;
    }

    // Constructor de conveniencia para tests unitarios y usos embebidos.
    public LoginAttemptService(
            Clock clock, MeterRegistry meterRegistry, int maxAttempts, int maxAttemptsPerIp, long windowSeconds) {
        this(clock, meterRegistry, new InMemoryRateLimitStore(clock), maxAttempts, maxAttemptsPerIp, windowSeconds);
    }

    public void checkAllowed(String ip, String username) {
        long windowId = currentWindow();
        long retryAfter = secondsUntilNextWindow();

        long identityCount = store.current(identityKey(windowId, ip, username));
        if (identityCount >= maxAttempts) {
            meterRegistry.counter("auth.login.blocked").increment();
            throw new LoginBlockedException(retryAfter);
        }

        long ipCount = store.current(ipKey(windowId, ip));
        if (ipCount >= maxAttemptsPerIp) {
            meterRegistry.counter("auth.login.blocked").increment();
            throw new LoginBlockedException(retryAfter);
        }
    }

    public void recordFailure(String ip, String username) {
        long windowId = currentWindow();
        Duration ttl = Duration.ofMillis(Math.max(1, secondsUntilNextWindow() * 1000));
        store.incrementAndGet(identityKey(windowId, ip, username), ttl);
        store.incrementAndGet(ipKey(windowId, ip), ttl);
        meterRegistry.counter("auth.login.failures").increment();
    }

    public void recordSuccess(String ip, String username) {
        store.reset(identityKey(currentWindow(), ip, username));
    }

    private long currentWindow() {
        return clock.millis() / windowMillis;
    }

    private long secondsUntilNextWindow() {
        long elapsed = clock.millis() % windowMillis;
        return ((windowMillis - elapsed) + 999) / 1000;
    }

    private String identityKey(long windowId, String ip, String username) {
        String normalizedUser = username == null || username.isBlank()
                ? "unknown"
                : username.trim().toLowerCase(Locale.ROOT);
        return KEY_PREFIX + "id:" + windowId + ":" + ip + "|" + normalizedUser;
    }

    private String ipKey(long windowId, String ip) {
        return KEY_PREFIX + "ip:" + windowId + ":" + ip + "|*";
    }
}
