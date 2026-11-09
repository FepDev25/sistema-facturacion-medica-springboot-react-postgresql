package com.fepdev.sfm.backend.domain.auth.token;

import org.springframework.security.core.AuthenticationException;

/**
 * El refresh token no existe, expiro, fue revocado o se reuso fuera de la ventana
 * de gracia. Se traduce a 401 y obliga al usuario a iniciar sesion de nuevo.
 */
public class InvalidRefreshTokenException extends AuthenticationException {

    public InvalidRefreshTokenException() {
        super("La sesion expiro o el refresh token no es valido.");
    }

    public InvalidRefreshTokenException(String message) {
        super(message);
    }
}
