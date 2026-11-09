package com.fepdev.sfm.backend.security;

import java.time.Clock;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.micrometer.core.instrument.MeterRegistry;

/**
 * Limita intentos fallidos de login por identidad (IP + usuario) y por IP.
 *
 * <p>La app corre en un solo dyno; un contador en memoria es suficiente y evita
 * agregar Redis al camino critico de autenticacion. Si se escala horizontalmente,
 * este servicio se mueve a Redis igual que el rate limit de IA.</p>
 */
@Service
public class LoginAttemptService {

    private static final int MAX_TRACKED_KEYS = 20_000;

    private record Window(long id, AtomicInteger count) {}

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final Clock clock;
    private final MeterRegistry meterRegistry;
    private final int maxAttempts;
    private final int maxAttemptsPerIp;
    private final long windowMillis;

    public LoginAttemptService(
            Clock clock,
            MeterRegistry meterRegistry,
            @Value("${app.auth.login.max-attempts:10}") int maxAttempts,
            @Value("${app.auth.login.max-attempts-per-ip:30}") int maxAttemptsPerIp,
            @Value("${app.auth.login.window-seconds:300}") long windowSeconds) {
        this.clock = clock;
        this.meterRegistry = meterRegistry;
        this.maxAttempts = maxAttempts;
        this.maxAttemptsPerIp = maxAttemptsPerIp;
        this.windowMillis = Math.max(1, windowSeconds) * 1000;
    }

    public void checkAllowed(String ip, String username) {
        long windowId = currentWindow();
        long retryAfter = secondsUntilNextWindow();

        Window identity = windows.get(identityKey(ip, username));
        if (identity != null && identity.id() == windowId
                && identity.count().get() >= maxAttempts) {
            meterRegistry.counter("auth.login.blocked").increment();
            throw new LoginBlockedException(retryAfter);
        }

        Window perIp = windows.get(ipKey(ip));
        if (perIp != null && perIp.id() == windowId
                && perIp.count().get() >= maxAttemptsPerIp) {
            meterRegistry.counter("auth.login.blocked").increment();
            throw new LoginBlockedException(retryAfter);
        }
    }

    public void recordFailure(String ip, String username) {
        increment(identityKey(ip, username));
        increment(ipKey(ip));
        meterRegistry.counter("auth.login.failures").increment();
        evictIfNeeded();
    }

    public void recordSuccess(String ip, String username) {
        windows.remove(identityKey(ip, username));
    }

    private void increment(String key) {
        long windowId = currentWindow();
        windows.compute(key, (ignored, existing) ->
                existing == null || existing.id() != windowId
                        ? new Window(windowId, new AtomicInteger(1))
                        : new Window(windowId, new AtomicInteger(existing.count().incrementAndGet())));
    }

    private long currentWindow() {
        return clock.millis() / windowMillis;
    }

    private long secondsUntilNextWindow() {
        long elapsed = clock.millis() % windowMillis;
        return ((windowMillis - elapsed) + 999) / 1000;
    }

    private String identityKey(String ip, String username) {
        String normalizedUser = username == null || username.isBlank()
                ? "unknown"
                : username.trim().toLowerCase(Locale.ROOT);
        return ip + "|" + normalizedUser;
    }

    private String ipKey(String ip) {
        return ip + "|*";
    }

    private void evictIfNeeded() {
        if (windows.size() <= MAX_TRACKED_KEYS) {
            return;
        }
        long windowId = currentWindow();
        windows.entrySet().removeIf(entry -> entry.getValue().id() != windowId);
    }
}
