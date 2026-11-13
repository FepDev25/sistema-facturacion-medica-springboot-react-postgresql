package com.fepdev.sfm.backend.ai.guard;

// Se lanza cuando un usuario supera el limite de llamadas de IA. Incluye los
// segundos de espera para responder con Retry-After.
public class AiRateLimitExceededException extends RuntimeException {

    private final long retryAfterSeconds;

    public AiRateLimitExceededException(String message) {
        this(message, 60);
    }

    public AiRateLimitExceededException(String message, long retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
