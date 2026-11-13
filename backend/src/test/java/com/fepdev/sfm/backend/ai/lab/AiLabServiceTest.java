package com.fepdev.sfm.backend.ai.lab;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;

import com.fepdev.sfm.backend.ai.guard.AiRateLimiter;
import com.fepdev.sfm.backend.ai.history.PatientConversationMemory;
import com.fepdev.sfm.backend.ai.metrics.AiPricingProperties;
import com.fepdev.sfm.backend.ai.metrics.AiUsageRecorder;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import tools.jackson.databind.ObjectMapper;

class AiLabServiceTest {

    private final SimpleMeterRegistry registry = new SimpleMeterRegistry();
    private final AiUsageRecorder recorder = new AiUsageRecorder(registry,
            new AiPricingProperties("model-a", Map.of(
                    "model-a", new AiPricingProperties.ModelPrice(1.0, 5.0))), "v-test");

    private AiLabService service() {
        return new AiLabService(registry, recorder,
                new AiRateLimiter(20, Clock.systemUTC()),
                new PatientConversationMemory((StringRedisTemplate) null, new ObjectMapper(), 900, 4),
                new AiEvalThresholds(new ObjectMapper()));
    }

    @Test
    void snapshotIncludesConfigurationAndUsage() {
        registry.counter("ai.requests", "feature", "icd10-normalize", "outcome", "success")
                .increment(3);
        registry.counter("ai.requests", "feature", "icd10-normalize", "outcome", "error")
                .increment(1);
        registry.counter("ai.tokens", "feature", "icd10-normalize", "type", "prompt")
                .increment(1_000);
        registry.counter("ai.tokens", "feature", "icd10-normalize", "type", "completion")
                .increment(200);
        registry.counter("ai.cost.usd", "feature", "icd10-normalize").increment(0.002);
        registry.timer("ai.latency", "feature", "icd10-normalize")
                .record(150, TimeUnit.MILLISECONDS);

        AiLabResponse response = service().snapshot();

        assertThat(response.model()).isEqualTo("model-a");
        assertThat(response.promptVersion()).isEqualTo("v-test");
        assertThat(response.rateLimitPerMinute()).isEqualTo(20);
        assertThat(response.memoryTtlSeconds()).isEqualTo(900);
        assertThat(response.memoryMaxTurns()).isEqualTo(4);
        assertThat(response.features()).hasSize(6);
        assertThat(response.pricing()).singleElement()
                .satisfies(price -> assertThat(price.model()).isEqualTo("model-a"));

        AiLabResponse.FeatureUsage usage = response.usage().stream()
                .filter(item -> item.feature().equals("icd10-normalize"))
                .findFirst().orElseThrow();
        assertThat(usage.requests()).isEqualTo(3.0);
        assertThat(usage.errors()).isEqualTo(1.0);
        assertThat(usage.promptTokens()).isEqualTo(1_000.0);
        assertThat(usage.completionTokens()).isEqualTo(200.0);
        assertThat(usage.costUsd()).isEqualTo(0.002);
        assertThat(usage.latencyMaxMs()).isGreaterThanOrEqualTo(150.0);
    }

    @Test
    void snapshotWithoutMetricsReturnsZeros() {
        AiLabResponse response = service().snapshot();

        assertThat(response.usage()).allSatisfy(usage -> {
            assertThat(usage.requests()).isZero();
            assertThat(usage.errors()).isZero();
            assertThat(usage.promptTokens()).isZero();
            assertThat(usage.costUsd()).isZero();
            assertThat(usage.latencyMaxMs()).isZero();
        });
    }

    @Test
    void snapshotIncludesEvalThresholdsFromClasspath() {
        AiLabResponse response = service().snapshot();

        assertThat(response.evals().mode()).isEqualTo("manual");
        assertThat(response.evals().thresholdsVersion()).isEqualTo(1);
        assertThat(response.evals().thresholds()).containsKeys("icd10", "extraction", "suggestion");
        assertThat(response.evals().thresholds().get("icd10")).containsKeys("minTop1", "minTop3");
    }
}
