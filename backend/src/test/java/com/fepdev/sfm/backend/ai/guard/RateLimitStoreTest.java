package com.fepdev.sfm.backend.ai.guard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.RedisScript;

class RateLimitStoreTest {

    private static final class MutableClock extends Clock {
        private Instant instant = Instant.parse("2026-11-08T12:00:00Z");

        void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }

    @Test
    void inMemoryIncrementsAndExpires() {
        MutableClock clock = new MutableClock();
        var store = new InMemoryRateLimitStore(clock);

        assertThat(store.incrementAndGet("k", Duration.ofSeconds(60))).isEqualTo(1);
        assertThat(store.incrementAndGet("k", Duration.ofSeconds(60))).isEqualTo(2);
        assertThat(store.current("k")).isEqualTo(2);

        clock.advance(Duration.ofSeconds(61));

        assertThat(store.current("k")).isZero();
        assertThat(store.incrementAndGet("k", Duration.ofSeconds(60))).isEqualTo(1);
    }

    @Test
    void inMemoryResetRemovesCounter() {
        var store = new InMemoryRateLimitStore(Clock.systemUTC());
        store.incrementAndGet("k", Duration.ofMinutes(1));

        store.reset("k");

        assertThat(store.current("k")).isZero();
    }

    @Test
    void fallbackUsesMemoryWhenPrimaryFails() {
        var primary = new RateLimitStore() {
            @Override
            public long incrementAndGet(String key, Duration ttl) {
                throw new IllegalStateException("redis down");
            }

            @Override
            public long current(String key) {
                throw new IllegalStateException("redis down");
            }

            @Override
            public void reset(String key) {
                throw new IllegalStateException("redis down");
            }

            @Override
            public boolean isDistributed() {
                return true;
            }
        };
        var fallback = new InMemoryRateLimitStore(Clock.systemUTC());
        var store = new FallbackRateLimitStore(primary, fallback);

        assertThat(store.incrementAndGet("k", Duration.ofMinutes(1))).isEqualTo(1);
        assertThat(store.incrementAndGet("k", Duration.ofMinutes(1))).isEqualTo(2);
        assertThat(store.current("k")).isEqualTo(2);
        store.reset("k");
        assertThat(store.current("k")).isZero();
        assertThat(store.isDistributed()).isTrue();
    }

    @Test
    @SuppressWarnings("unchecked")
    void redisStoreUsesAtomicScriptAndReadsCurrent() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        when(redis.execute(any(RedisScript.class), anyList(), any())).thenReturn(4L);
        when(redis.opsForValue()).thenReturn(valueOps);
        when(valueOps.get("k")).thenReturn("4");

        var store = new RedisRateLimitStore(redis);

        assertThat(store.incrementAndGet("k", Duration.ofSeconds(60))).isEqualTo(4);
        assertThat(store.current("k")).isEqualTo(4);
        store.reset("k");

        verify(redis).delete("k");
        assertThat(store.isDistributed()).isTrue();
    }

    @Test
    void redisStoreHandlesMissingAndMalformedValues() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(anyString())).thenReturn(null, "not-a-number");

        var store = new RedisRateLimitStore(redis);

        assertThat(store.current("missing")).isZero();
        assertThat(store.current("malformed")).isZero();
    }
}
