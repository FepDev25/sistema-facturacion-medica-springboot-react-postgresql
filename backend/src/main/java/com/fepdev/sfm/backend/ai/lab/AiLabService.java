package com.fepdev.sfm.backend.ai.lab;

import java.util.List;
import java.util.concurrent.TimeUnit;

import org.springframework.stereotype.Service;

import com.fepdev.sfm.backend.ai.guard.AiRateLimiter;
import com.fepdev.sfm.backend.ai.history.PatientConversationMemory;
import com.fepdev.sfm.backend.ai.lab.AiLabResponse.EvalsInfo;
import com.fepdev.sfm.backend.ai.lab.AiLabResponse.FeatureInfo;
import com.fepdev.sfm.backend.ai.lab.AiLabResponse.FeatureUsage;
import com.fepdev.sfm.backend.ai.lab.AiLabResponse.ModelPricing;
import com.fepdev.sfm.backend.ai.metrics.AiPricingProperties;
import com.fepdev.sfm.backend.ai.metrics.AiUsageRecorder;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;

// Consolida en una sola lectura los datos que ya produce la capa de IA. Es de solo
// lectura y no consulta proveedores ni bases de datos.
@Service
public class AiLabService {

    private static final List<FeatureInfo> FEATURES = List.of(
            new FeatureInfo("icd10-normalize", "Normalizacion CIE-10",
                    "POST /api/v1/ai/icd10/suggest", "v1",
                    "Convierte lenguaje coloquial a terminologia CIE-10 formal."),
            new FeatureInfo("icd10-rerank", "Reranking CIE-10",
                    "POST /api/v1/ai/icd10/suggest", "v1",
                    "Ordena los candidatos recuperados por el vector store."),
            new FeatureInfo("records-extract", "Extraccion de notas",
                    "POST /api/v1/ai/records/extract", "v1",
                    "Extrae diagnosticos, prescripciones y procedimientos con tool calling."),
            new FeatureInfo("history-vector", "Historial (vectorial)",
                    "POST /api/v1/ai/patients/{id}/query", "v1",
                    "Responde preguntas sobre expedientes recuperados semanticamente."),
            new FeatureInfo("history-summary", "Historial (resumen)",
                    "POST /api/v1/ai/patients/{id}/query", "v1",
                    "Responde sobre el historial completo construido desde BD."),
            new FeatureInfo("items-suggest", "Sugerencia de items",
                    "POST /api/v1/ai/invoices/{id}/suggest-items", "v1",
                    "Sugiere servicios y medicamentos del catalogo para facturar."));

    private final MeterRegistry meterRegistry;
    private final AiUsageRecorder usageRecorder;
    private final AiRateLimiter rateLimiter;
    private final PatientConversationMemory conversationMemory;
    private final AiEvalThresholds evalThresholds;

    public AiLabService(MeterRegistry meterRegistry, AiUsageRecorder usageRecorder,
            AiRateLimiter rateLimiter, PatientConversationMemory conversationMemory,
            AiEvalThresholds evalThresholds) {
        this.meterRegistry = meterRegistry;
        this.usageRecorder = usageRecorder;
        this.rateLimiter = rateLimiter;
        this.conversationMemory = conversationMemory;
        this.evalThresholds = evalThresholds;
    }

    public AiLabResponse snapshot() {
        AiPricingProperties pricing = usageRecorder.getPricing();

        List<ModelPricing> prices = pricing.models().entrySet().stream()
                .map(entry -> new ModelPricing(entry.getKey(),
                        entry.getValue().inputPerMillionUsd(),
                        entry.getValue().outputPerMillionUsd()))
                .toList();

        List<FeatureUsage> usage = FEATURES.stream()
                .map(feature -> new FeatureUsage(
                        feature.id(),
                        counter("ai.requests", feature.id(), "outcome", "success"),
                        counter("ai.requests", feature.id(), "outcome", "error"),
                        counter(AiUsageRecorder.TOKENS_METRIC, feature.id(), "type", "prompt"),
                        counter(AiUsageRecorder.TOKENS_METRIC, feature.id(), "type", "completion"),
                        counter(AiUsageRecorder.COST_METRIC, feature.id()),
                        latencyMaxMs(feature.id())))
                .toList();

        EvalsInfo evals = new EvalsInfo(evalThresholds.getMode(),
                evalThresholds.getVersion(), evalThresholds.getFeatures());

        return new AiLabResponse(
                pricing.defaultModel(),
                usageRecorder.getPromptVersion(),
                rateLimiter.isDistributed(),
                rateLimiter.getRequestsPerMinute(),
                conversationMemory.getTtlSeconds(),
                conversationMemory.getMaxTurns(),
                FEATURES,
                prices,
                usage,
                evals);
    }

    private double counter(String name, String feature, String... extraTags) {
        var search = meterRegistry.find(name).tag("feature", feature);
        for (int i = 0; i + 1 < extraTags.length; i += 2) {
            search = search.tag(extraTags[i], extraTags[i + 1]);
        }
        Counter counter = search.counter();
        return counter != null ? counter.count() : 0.0;
    }

    private double latencyMaxMs(String feature) {
        Timer timer = meterRegistry.find("ai.latency").tag("feature", feature).timer();
        return timer != null ? timer.max(TimeUnit.MILLISECONDS) : 0.0;
    }
}
