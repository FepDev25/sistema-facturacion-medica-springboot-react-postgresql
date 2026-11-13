package com.fepdev.sfm.backend.ai.metrics;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.boot.context.properties.ConfigurationProperties;

// Precios configurables por modelo. No contiene secretos: solo tarifas publicas
// expresadas en USD por millon de tokens.
@ConfigurationProperties(prefix = "app.ai.pricing")
public record AiPricingProperties(
        String defaultModel,
        Map<String, ModelPrice> models) {

    public static final String FALLBACK_MODEL = "claude-haiku-4-5-20251001";

    public record ModelPrice(double inputPerMillionUsd, double outputPerMillionUsd) {}

    public AiPricingProperties {
        if (defaultModel == null || defaultModel.isBlank()) {
            defaultModel = FALLBACK_MODEL;
        }
        models = models == null || models.isEmpty()
                ? new LinkedHashMap<>()
                : new LinkedHashMap<>(models);
        if (!models.containsKey(defaultModel)) {
            models.put(defaultModel, new ModelPrice(1.0, 5.0));
        }
    }

    // Costo en USD de una llamada. Un modelo desconocido usa la tarifa del modelo
    // por defecto para no perder la senal de gasto.
    public double costUsd(String model, int promptTokens, int completionTokens) {
        ModelPrice price = resolvePrice(model);
        return (promptTokens / 1_000_000.0) * price.inputPerMillionUsd()
                + (completionTokens / 1_000_000.0) * price.outputPerMillionUsd();
    }

    public ModelPrice resolvePrice(String model) {
        ModelPrice exact = model == null ? null : models.get(model);
        if (exact != null) {
            return exact;
        }
        ModelPrice fallback = models.get(defaultModel);
        return fallback != null ? fallback : new ModelPrice(0.0, 0.0);
    }
}
