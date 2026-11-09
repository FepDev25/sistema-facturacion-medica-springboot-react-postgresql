package com.fepdev.sfm.backend.ai.guard;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

class AiRateLimiterTest {

    private static final class MutableClock extends Clock {
        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

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
    void allowsRequestsUpToTheLimitPerUser() {
        var limiter = new AiRateLimiter(2, Clock.fixed(Instant.parse("2026-11-08T12:00:00Z"), ZoneOffset.UTC));

        limiter.check("doctor1");
        limiter.check("doctor1");

        assertThatThrownBy(() -> limiter.check("doctor1"))
                .isInstanceOf(AiRateLimitExceededException.class)
                .hasMessageContaining("2 solicitudes");
    }

    @Test
    void countsUsersIndependently() {
        var limiter = new AiRateLimiter(1, Clock.fixed(Instant.parse("2026-11-08T12:00:00Z"), ZoneOffset.UTC));

        limiter.check("doctor1");

        assertThatCode(() -> limiter.check("recep1")).doesNotThrowAnyException();
        assertThatThrownBy(() -> limiter.check("doctor1"))
                .isInstanceOf(AiRateLimitExceededException.class);
    }

    @Test
    void resetsTheWindowOnTheNextMinute() {
        var clock = new MutableClock(Instant.parse("2026-11-08T12:00:30Z"));
        var limiter = new AiRateLimiter(1, clock);

        limiter.check("doctor1");
        assertThatThrownBy(() -> limiter.check("doctor1"))
                .isInstanceOf(AiRateLimitExceededException.class);

        clock.advance(Duration.ofSeconds(31));

        assertThatCode(() -> limiter.check("doctor1")).doesNotThrowAnyException();
    }
}
