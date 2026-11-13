package com.fepdev.sfm.backend.ai.metrics;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

class AiPricingPropertiesTest {

    @Test
    void calculatesCostFromConfiguredRates() {
        var pricing = new AiPricingProperties("model-a", Map.of(
                "model-a", new AiPricingProperties.ModelPrice(1.0, 5.0)));

        double cost = pricing.costUsd("model-a", 1_000_000, 200_000);

        assertThat(cost).isEqualTo(2.0);
    }

    @Test
    void zeroTokensCostZero() {
        var pricing = new AiPricingProperties("model-a", Map.of(
                "model-a", new AiPricingProperties.ModelPrice(3.0, 15.0)));

        assertThat(pricing.costUsd("model-a", 0, 0)).isZero();
    }

    @Test
    void unknownModelUsesDefaultRate() {
        var pricing = new AiPricingProperties("model-a", Map.of(
                "model-a", new AiPricingProperties.ModelPrice(1.0, 2.0)));

        assertThat(pricing.costUsd("model-z", 1_000_000, 0)).isEqualTo(1.0);
    }

    @Test
    void missingModelNameUsesDefaultRate() {
        var pricing = new AiPricingProperties("model-a", Map.of(
                "model-a", new AiPricingProperties.ModelPrice(1.0, 2.0)));

        assertThat(pricing.costUsd(null, 0, 1_000_000)).isEqualTo(2.0);
    }

    @Test
    void defaultsToClaudeHaikuWhenNoConfiguration() {
        var pricing = new AiPricingProperties(null, null);

        assertThat(pricing.defaultModel()).isEqualTo(AiPricingProperties.FALLBACK_MODEL);
        assertThat(pricing.models()).containsKey(AiPricingProperties.FALLBACK_MODEL);
    }

    @Test
    void recorderRecordsTokensAndCostWithFeatureAndTypeTags() {
        var registry = new SimpleMeterRegistry();
        var pricing = new AiPricingProperties("model-a", Map.of(
                "model-a", new AiPricingProperties.ModelPrice(1.0, 5.0)));
        var recorder = new AiUsageRecorder(registry, pricing, "v-test");

        recorder.record("demo", com.fepdev.sfm.backend.ai.support.AiTestFixtures.response(
                "hola", 1_000_000, 1_000_000, "model-a"));

        assertThat(registry.get("ai.tokens").tags("feature", "demo", "type", "prompt")
                .counter().count()).isEqualTo(1_000_000);
        assertThat(registry.get("ai.tokens").tags("feature", "demo", "type", "completion")
                .counter().count()).isEqualTo(1_000_000);
        assertThat(registry.get("ai.cost.usd").tag("feature", "demo").counter().count())
                .isEqualTo(6.0);
        assertThat(recorder.getPromptVersion()).isEqualTo("v-test");
    }

    @Test
    void recorderWithoutUsageOnlyIncrementsMissingMetric() {
        var registry = new SimpleMeterRegistry();
        var recorder = new AiUsageRecorder(registry,
                new AiPricingProperties("model-a", Map.of()), "v-test");

        recorder.record("demo", (org.springframework.ai.chat.model.ChatResponse) null);

        assertThat(registry.get("ai.usage.missing").tag("feature", "demo").counter().count())
                .isEqualTo(1.0);
        assertThat(registry.find("ai.tokens").counters()).isEmpty();
    }

    @Test
    void streamingRecordAcceptsExplicitTokens() {
        var registry = new SimpleMeterRegistry();
        var recorder = new AiUsageRecorder(registry,
                new AiPricingProperties("model-a", Map.of(
                        "model-a", new AiPricingProperties.ModelPrice(1.0, 1.0))), "v-test");

        recorder.record("demo", "model-a", 500, 500);

        assertThat(registry.get("ai.cost.usd").tag("feature", "demo").counter().count())
                .isEqualTo(0.001);
    }

    @Test
    void unknownModelInResponseStillRecordsCost() {
        var registry = new SimpleMeterRegistry();
        var recorder = new AiUsageRecorder(registry,
                new AiPricingProperties("model-a", Map.of(
                        "model-a", new AiPricingProperties.ModelPrice(1.0, 1.0))), "v-test");

        recorder.record("demo", com.fepdev.sfm.backend.ai.support.AiTestFixtures.response(
                "hola", 1_000_000, 0, "model-unknown"));

        assertThat(registry.get("ai.cost.usd").tag("feature", "demo").counter().count())
                .isEqualTo(1.0);
    }
}
