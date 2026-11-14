package com.fepdev.sfm.backend.security;

/**
 * Se lanza cuando una IP o un usuario acumularon demasiados intentos fallidos de login.
 * El {@code Retry-After} indica cuantos segundos faltan para que se abra la ventana.
 */
public class LoginBlockedException extends RuntimeException {

    private final long retryAfterSeconds;

    public LoginBlockedException(long retryAfterSeconds) {
        super("Demasiados intentos de inicio de sesion. Intenta de nuevo en " + Math.max(1, retryAfterSeconds)
                + " segundos.");
        this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
