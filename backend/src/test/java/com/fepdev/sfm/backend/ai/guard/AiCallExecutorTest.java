package com.fepdev.sfm.backend.ai.guard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fepdev.sfm.backend.ai.metrics.AiPricingProperties;
import com.fepdev.sfm.backend.ai.metrics.AiUsageRecorder;
import com.fepdev.sfm.backend.ai.support.AiTestFixtures;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ResponseEntity;
import org.springframework.ai.chat.model.ChatResponse;
import reactor.core.publisher.Flux;

class AiCallExecutorTest {

    private AiCallExecutor executor(int timeoutSeconds, int maxRetries) {
        return new AiCallExecutor(new SimpleMeterRegistry(), timeoutSeconds, maxRetries);
    }

    private AiCallExecutor executor(SimpleMeterRegistry registry) {
        var pricing = new AiPricingProperties(
                AiTestFixtures.MODEL, Map.of(AiTestFixtures.MODEL, new AiPricingProperties.ModelPrice(1.0, 5.0)));
        var recorder = new AiUsageRecorder(registry, pricing, "v-test");
        return new AiCallExecutor(registry, 5, 0, recorder);
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

    @Test
    void callChatRecordsUsageAndCost() {
        var registry = new SimpleMeterRegistry();
        ChatResponse response = AiTestFixtures.response("hola", 1_000_000, 1_000_000);

        ChatResponse result = executor(registry).callChat("demo", () -> response);

        assertThat(result).isSameAs(response);
        assertThat(registry.get("ai.tokens")
                        .tags("feature", "demo", "type", "prompt")
                        .counter()
                        .count())
                .isEqualTo(1_000_000);
        assertThat(registry.get("ai.cost.usd").tag("feature", "demo").counter().count())
                .isEqualTo(6.0);
    }

    @Test
    void callEntityRecordsUsageAndKeepsEntity() {
        var registry = new SimpleMeterRegistry();
        ChatResponse response = AiTestFixtures.response("{}", 100, 20);
        ResponseEntity<ChatResponse, String> entity = new ResponseEntity<>(response, "payload");

        ResponseEntity<ChatResponse, String> result = executor(registry).callEntity("demo", () -> entity);

        assertThat(result.entity()).isEqualTo("payload");
        assertThat(registry.get("ai.tokens")
                        .tags("feature", "demo", "type", "completion")
                        .counter()
                        .count())
                .isEqualTo(20);
    }

    @Test
    void callEntityWithNullResultDoesNotFail() {
        var registry = new SimpleMeterRegistry();

        ResponseEntity<ChatResponse, String> result = executor(registry).callEntity("demo", () -> null);

        assertThat(result).isNull();
        assertThat(registry.find("ai.tokens").counters()).isEmpty();
    }

    @Test
    void streamAggregatesUsageOnceAndEmitsTokens() {
        var registry = new SimpleMeterRegistry();
        ChatResponse first = AiTestFixtures.response("Hola ", 100, 1);
        ChatResponse second = AiTestFixtures.response("mundo", 100, 25);

        String joined = executor(registry).stream("history-vector", () -> Flux.just(first, second))
                .map(response -> response.getResult().getOutput().getText())
                .collectList()
                .map(list -> String.join("", list))
                .block(Duration.ofSeconds(5));

        assertThat(joined).isEqualTo("Hola mundo");
        assertThat(registry.get("ai.requests")
                        .tags("feature", "history-vector", "outcome", "success")
                        .counter()
                        .count())
                .isEqualTo(1.0);
        assertThat(registry.get("ai.tokens")
                        .tags("feature", "history-vector", "type", "prompt")
                        .counter()
                        .count())
                .isEqualTo(100);
        assertThat(registry.get("ai.tokens")
                        .tags("feature", "history-vector", "type", "completion")
                        .counter()
                        .count())
                .isEqualTo(25);
    }

    @Test
    void streamRecordsMissingUsageWhenNoMetadata() {
        var registry = new SimpleMeterRegistry();

        executor(registry).stream("demo", () -> Flux.<ChatResponse>empty()).blockLast(Duration.ofSeconds(5));

        assertThat(registry.get("ai.usage.missing")
                        .tag("feature", "demo")
                        .counter()
                        .count())
                .isEqualTo(1.0);
    }

    @Test
    void streamMapsProviderErrorsToAiUnavailable() {
        var registry = new SimpleMeterRegistry();

        assertThatThrownBy(() -> executor(registry).stream(
                                "demo", () -> Flux.error(new IllegalStateException("provider down")))
                        .blockLast(Duration.ofSeconds(5)))
                .isInstanceOf(AiUnavailableException.class)
                .hasMessageContaining("no esta disponible");

        assertThat(registry.get("ai.requests")
                        .tags("feature", "demo", "outcome", "error")
                        .counter()
                        .count())
                .isEqualTo(1.0);
    }

    @Test
    void streamTimesOutAndMapsToAiUnavailable() {
        assertThatThrownBy(
                        () -> executor(1, 0).stream("demo", () -> Flux.never()).blockLast(Duration.ofSeconds(5)))
                .isInstanceOf(AiUnavailableException.class)
                .hasMessageContaining("tiempo de espera");
    }
}
