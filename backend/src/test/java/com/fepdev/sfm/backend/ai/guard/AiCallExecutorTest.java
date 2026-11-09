package com.fepdev.sfm.backend.ai.guard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

class AiCallExecutorTest {

    private AiCallExecutor executor(int timeoutSeconds, int maxRetries) {
        return new AiCallExecutor(new SimpleMeterRegistry(), timeoutSeconds, maxRetries);
    }

    @Test
    void returnsTheActionResult() {
        assertThat(executor(5, 0).call("test", () -> "ok")).isEqualTo("ok");
    }

    @Test
    void retriesTransientFailures() {
        AtomicInteger attempts = new AtomicInteger();

        String result = executor(5, 1).call("test", () -> {
            if (attempts.incrementAndGet() == 1) {
                throw new IllegalStateException("transient");
            }
            return "recovered";
        });

        assertThat(result).isEqualTo("recovered");
        assertThat(attempts.get()).isEqualTo(2);
    }

    @Test
    void throwsAiUnavailableAfterExhaustingRetries() {
        AtomicInteger attempts = new AtomicInteger();

        assertThatThrownBy(() -> executor(5, 1).call("test", () -> {
            attempts.incrementAndGet();
            throw new IllegalStateException("down");
        }))
                .isInstanceOf(AiUnavailableException.class)
                .hasMessageContaining("no esta disponible");

        assertThat(attempts.get()).isEqualTo(2);
    }

    @Test
    void abortsWhenTheTimeoutExpires() {
        assertThatThrownBy(() -> executor(1, 1).call("test", () -> {
            try {
                Thread.sleep(5_000);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
            }
            return "late";
        }))
                .isInstanceOf(AiUnavailableException.class)
                .hasMessageContaining("tiempo de espera");
    }
}
