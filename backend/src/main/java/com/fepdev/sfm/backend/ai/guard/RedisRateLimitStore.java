package com.fepdev.sfm.backend.ai.guard;

import java.time.Duration;
import java.util.List;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;

// INCR + PEXPIRE atomico en Redis. La clave ya incluye la ventana temporal, asi
// que el TTL solo sirve para limpiar contadores viejos.
public class RedisRateLimitStore implements RateLimitStore {

    private static final String INCREMENT_SCRIPT = """
            local value = redis.call('INCR', KEYS[1])
            if value == 1 then
              redis.call('PEXPIRE', KEYS[1], ARGV[1])
            end
            return value
            """;

    private static final DefaultRedisScript<Long> SCRIPT =
            new DefaultRedisScript<>(INCREMENT_SCRIPT, Long.class);

    private final StringRedisTemplate redisTemplate;

    public RedisRateLimitStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public long incrementAndGet(String key, Duration ttl) {
        Long value = redisTemplate.execute(SCRIPT, List.of(key), String.valueOf(ttl.toMillis()));
        return value != null ? value : 0L;
    }

    @Override
    public long current(String key) {
        String value = redisTemplate.opsForValue().get(key);
        if (value == null) {
            return 0L;
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException ex) {
            return 0L;
        }
    }

    @Override
    public void reset(String key) {
        redisTemplate.delete(key);
    }

    @Override
    public boolean isDistributed() {
        return true;
    }
}
