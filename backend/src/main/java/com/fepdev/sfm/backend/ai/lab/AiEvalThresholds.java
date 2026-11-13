package com.fepdev.sfm.backend.ai.lab;

import java.io.IOException;
import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

// Lee los umbrales del gate de evals desde el classpath. El mismo archivo lo consume
// scripts/ai-eval.py, para que el AI Lab y el runner no se desincronicen.
@Component
public class AiEvalThresholds {

    private static final String RESOURCE = "ai-evals/thresholds.json";

    private final int version;
    private final String mode;
    private final Map<String, Map<String, Double>> features;

    public AiEvalThresholds(ObjectMapper objectMapper) {
        JsonNode root = load(objectMapper);
        this.version = root.path("version").asInt(0);
        this.mode = root.path("mode").asString("manual");
        this.features = parseFeatures(root.path("features"));
    }

    public int getVersion() {
        return version;
    }

    public String getMode() {
        return mode;
    }

    public Map<String, Map<String, Double>> getFeatures() {
        return features;
    }

    private static JsonNode load(ObjectMapper objectMapper) {
        ClassPathResource resource = new ClassPathResource(RESOURCE);
        try (InputStream in = resource.getInputStream()) {
            return objectMapper.readTree(in);
        } catch (IOException | RuntimeException ex) {
            throw new IllegalStateException("No se pudieron leer los umbrales de eval: " + RESOURCE, ex);
        }
    }

    private static Map<String, Map<String, Double>> parseFeatures(JsonNode node) {
        Map<String, Map<String, Double>> parsed = new LinkedHashMap<>();
        for (Map.Entry<String, JsonNode> feature : node.properties()) {
            Map<String, Double> limits = new LinkedHashMap<>();
            for (Map.Entry<String, JsonNode> limit : feature.getValue().properties()) {
                limits.put(limit.getKey(), limit.getValue().asDouble());
            }
            parsed.put(feature.getKey(), limits);
        }
        return Map.copyOf(parsed);
    }
}
