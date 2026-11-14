package com.fepdev.sfm.backend.ai.guard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.time.Clock;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class AiRateLimitFilterTest {

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void returns429WithRetryAfterWhenLimitExceeded() throws Exception {
        AiRateLimiter limiter = mock(AiRateLimiter.class);
        doThrow(new AiRateLimitExceededException("limite", 17)).when(limiter).check("doctor1");
        SecurityContextHolder.getContext()
                .setAuthentication(new UsernamePasswordAuthenticationToken("doctor1", null, List.of()));

        var filter = new AiRateLimitFilter(limiter);
        var request = new MockHttpServletRequest("POST", "/api/v1/ai/icd10/suggest");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getHeader("Retry-After")).isEqualTo("17");
        assertThat(response.getContentAsString()).contains("\"status\":429");
    }

    @Test
    void ignoresRequestsOutsideAiPrefix() throws Exception {
        AiRateLimiter limiter = mock(AiRateLimiter.class);
        var filter = new AiRateLimitFilter(limiter);
        var request = new MockHttpServletRequest("GET", "/api/v1/patients");
        var response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        verify(limiter, never()).check(org.mockito.ArgumentMatchers.anyString());
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void usesAnonymousWhenThereIsNoAuthentication() throws Exception {
        AiRateLimiter limiter = mock(AiRateLimiter.class);
        var filter = new AiRateLimitFilter(limiter);
        var request = new MockHttpServletRequest("POST", "/api/v1/ai/records/extract");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        verify(limiter).check("anonymous");
    }

    @Test
    void distributedLimiterDelegatesToStore() {
        RateLimitStore store = mock(RateLimitStore.class);
        var limiter = new AiRateLimiter(3, Clock.systemUTC(), store);

        assertThatCode(() -> limiter.check("doctor1")).doesNotThrowAnyException();
        assertThat(limiter.getRequestsPerMinute()).isEqualTo(3);
        assertThat(limiter.isDistributed()).isFalse();

        var distributedStore = new InMemoryRateLimitStore(Clock.systemUTC()) {
            @Override
            public boolean isDistributed() {
                return true;
            }
        };
        assertThat(new AiRateLimiter(3, Clock.systemUTC(), distributedStore).isDistributed())
                .isTrue();
    }

    @Test
    void exceptionDefaultsToSixtySecondRetry() {
        var ex = new AiRateLimitExceededException("x");
        assertThat(ex.getRetryAfterSeconds()).isEqualTo(60);
        assertThat(new AiRateLimitExceededException("x", 0).getRetryAfterSeconds())
                .isEqualTo(1);
    }

    @Test
    void fallbackStoreTracksWindowsAcrossCalls() {
        var clock = Clock.systemUTC();
        var store = new FallbackRateLimitStore(new InMemoryRateLimitStore(clock), new InMemoryRateLimitStore(clock));

        assertThat(store.incrementAndGet("k", Duration.ofMinutes(1))).isEqualTo(1);
        assertThat(store.current("k")).isEqualTo(1);
        assertThat(store.isDistributed()).isFalse();
    }
}
