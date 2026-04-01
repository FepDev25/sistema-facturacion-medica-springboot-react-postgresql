package com.fepdev.sfm.backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

@ExtendWith(MockitoExtension.class)
class TokenBlacklistServiceTest {

    @Mock private StringRedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;

    @InjectMocks private TokenBlacklistService service;

    @Test
    void blacklist_withPositiveTtl_storesKeyWithTtl() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        service.blacklist("jti-1", Duration.ofMinutes(10));

        verify(valueOperations).set("blacklisted_token:jti-1", "1", Duration.ofMinutes(10));
    }

    @Test
    void blacklist_withZeroOrNegativeTtl_doesNothing() {
        service.blacklist("jti-0", Duration.ZERO);
        service.blacklist("jti-n", Duration.ofSeconds(-1));

        verify(valueOperations, never()).set("blacklisted_token:jti-0", "1", Duration.ZERO);
        verify(valueOperations, never()).set("blacklisted_token:jti-n", "1", Duration.ofSeconds(-1));
    }

    @Test
    void isBlacklisted_delegatesToRedis() {
        when(redisTemplate.hasKey("blacklisted_token:jti-2")).thenReturn(Boolean.TRUE);
        when(redisTemplate.hasKey("blacklisted_token:jti-3")).thenReturn(Boolean.FALSE);

        assertThat(service.isBlacklisted("jti-2")).isTrue();
        assertThat(service.isBlacklisted("jti-3")).isFalse();
    }
}
