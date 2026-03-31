package com.fepdev.sfm.backend.security;

import java.time.Duration;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

// Servicio para revocar refresh tokens usando Redis como blacklist
// al hacer logout, el jti del refresh token se almacena en Redis con TTL = tiempo restante hasta su expiracion
// Una vez que el token hubiera expirado naturalmente, la entrada desaparece de Redis sola
@Service
public class TokenBlacklistService {

    private static final String KEY_PREFIX = "blacklisted_token:";

    private final StringRedisTemplate redisTemplate;

    public TokenBlacklistService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    // Agrega el jti del token a la blacklist con TTL = vida restante del token
    public void blacklist(String jti, Duration remainingTtl) {
        if (remainingTtl.isZero() || remainingTtl.isNegative()) {
            return; // el token ya expiro, no hace falta blacklistearlo
        }
        redisTemplate.opsForValue().set(KEY_PREFIX + jti, "1", remainingTtl);
    }

    // Retorna true si el jti esta en la blacklist
    public boolean isBlacklisted(String jti) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(KEY_PREFIX + jti));
    }
}
