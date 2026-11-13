package com.fepdev.sfm.backend.ai.lab;

import java.util.List;
import java.util.Map;

// Snapshot read-only para el AI Lab: no expone prompts completos ni datos de pacientes,
// solo catalogo de features, modelo, precios, consumo acumulado y umbrales de eval.
public record AiLabResponse(
        String model,
        String promptVersion,
        boolean distributedRateLimit,
        int rateLimitPerMinute,
        long memoryTtlSeconds,
        int memoryMaxTurns,
        List<FeatureInfo> features,
        List<ModelPricing> pricing,
        List<FeatureUsage> usage,
        EvalsInfo evals) {

    public record FeatureInfo(String id, String name, String endpoint, String promptVersion, String description) {}

    public record ModelPricing(String model, double inputPerMillionUsd, double outputPerMillionUsd) {}

    public record FeatureUsage(
            String feature,
            double requests,
            double errors,
            double promptTokens,
            double completionTokens,
            double costUsd,
            double latencyMaxMs) {}

    public record EvalsInfo(String mode, int thresholdsVersion, Map<String, Map<String, Double>> thresholds) {}
}
