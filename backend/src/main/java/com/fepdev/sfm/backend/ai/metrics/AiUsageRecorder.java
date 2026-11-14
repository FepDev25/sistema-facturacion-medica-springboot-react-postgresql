package com.fepdev.sfm.backend.ai.metrics;

import io.micrometer.core.instrument.MeterRegistry;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.metadata.ChatResponseMetadata;
import org.springframework.ai.chat.metadata.Usage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// Registra tokens y costo de cada respuesta del modelo.
//
// Spring AI expone `usage` en ChatResponse; los servicios obtienen la respuesta con
// `callChat(...)`/`callEntity(...)` para no perderla al pedir `content()` o `entity()`.
@Component
public class AiUsageRecorder {

    private static final Logger log = LoggerFactory.getLogger(AiUsageRecorder.class);

    public static final String TOKENS_METRIC = "ai.tokens";
    public static final String COST_METRIC = "ai.cost.usd";
    public static final String MISSING_USAGE_METRIC = "ai.usage.missing";

    private final MeterRegistry meterRegistry;
    private final AiPricingProperties pricing;
    private final String promptVersion;
    private final AtomicBoolean unknownModelWarned = new AtomicBoolean(false);

    public AiUsageRecorder(
            MeterRegistry meterRegistry,
            AiPricingProperties pricing,
            @Value("${app.ai.prompt-version:2026-11-13.1}") String promptVersion) {
        this.meterRegistry = meterRegistry;
        this.pricing = pricing;
        this.promptVersion = promptVersion;
    }

    // Instancia sin pricing real, para tests unitarios de AiCallExecutor.
    public static AiUsageRecorder noop(MeterRegistry meterRegistry) {
        return new AiUsageRecorder(meterRegistry, new AiPricingProperties(null, null), "test");
    }

    public void record(String feature, ChatResponse response) {
        if (response == null) {
            recordMissing(feature);
            return;
        }

        ChatResponseMetadata metadata = response.getMetadata();
        Usage usage = metadata != null ? metadata.getUsage() : null;
        Integer promptTokens = usage != null ? usage.getPromptTokens() : null;
        Integer completionTokens = usage != null ? usage.getCompletionTokens() : null;

        if (promptTokens == null && completionTokens == null) {
            recordMissing(feature);
            return;
        }

        int prompt = promptTokens != null ? Math.max(0, promptTokens) : 0;
        int completion = completionTokens != null ? Math.max(0, completionTokens) : 0;
        record(feature, resolveModel(metadata), prompt, completion);
    }

    // Punto de entrada para streaming: el ejecutor acumula prompt/completion de los
    // chunks y registra una sola vez al completar el flujo.
    public void record(String feature, String model, int promptTokens, int completionTokens) {
        int prompt = Math.max(0, promptTokens);
        int completion = Math.max(0, completionTokens);
        String resolvedModel = model == null || model.isBlank() ? pricing.defaultModel() : model;

        meterRegistry
                .counter(TOKENS_METRIC, "feature", feature, "type", "prompt")
                .increment(prompt);
        meterRegistry
                .counter(TOKENS_METRIC, "feature", feature, "type", "completion")
                .increment(completion);

        double costUsd = pricing.costUsd(resolvedModel, prompt, completion);
        meterRegistry.counter(COST_METRIC, "feature", feature).increment(costUsd);

        // Log estructurado (clave=valor) para buscarlo en Heroku/Vercel sin parsear texto libre.
        log.info(
                "ai_usage feature={} model={} promptVersion={} promptTokens={} completionTokens={} costUsd={}",
                feature,
                resolvedModel,
                promptVersion,
                prompt,
                completion,
                String.format(java.util.Locale.ROOT, "%.8f", costUsd));
    }

    public String getPromptVersion() {
        return promptVersion;
    }

    public AiPricingProperties getPricing() {
        return pricing;
    }

    private void recordMissing(String feature) {
        meterRegistry.counter(MISSING_USAGE_METRIC, "feature", feature).increment();
        log.debug("ai_usage feature={} promptVersion={} usage=unavailable", feature, promptVersion);
    }

    private String resolveModel(ChatResponseMetadata metadata) {
        String model = metadata != null ? metadata.getModel() : null;
        if (model != null && !model.isBlank()) {
            if (!pricing.models().containsKey(model) && unknownModelWarned.compareAndSet(false, true)) {
                log.warn(
                        "ai_usage modelo '{}' sin tarifa configurada; se usa la tarifa de '{}'",
                        model,
                        pricing.defaultModel());
            }
            return model;
        }
        return pricing.defaultModel();
    }
}
