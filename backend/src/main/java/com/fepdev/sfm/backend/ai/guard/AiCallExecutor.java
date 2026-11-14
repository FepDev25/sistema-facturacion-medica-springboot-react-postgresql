package com.fepdev.sfm.backend.ai.guard;

import com.fepdev.sfm.backend.ai.metrics.AiUsageRecorder;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.time.Duration;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ResponseEntity;
import org.springframework.ai.chat.metadata.ChatResponseMetadata;
import org.springframework.ai.chat.metadata.Usage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

// Envuelve cada llamada a un LLM con timeout, reintento y metricas.
// No se reintenta un timeout: si el modelo tarda mas de la cuenta, insistir solo
// empeora la latencia percibida por el usuario.
@Component
public class AiCallExecutor {

    private static final Logger log = LoggerFactory.getLogger(AiCallExecutor.class);

    private final MeterRegistry meterRegistry;
    private final AiUsageRecorder usageRecorder;
    private final ExecutorService executor;
    private final long timeoutSeconds;
    private final int maxRetries;

    @Autowired
    public AiCallExecutor(
            MeterRegistry meterRegistry,
            @Value("${app.ai.timeout-seconds:30}") long timeoutSeconds,
            @Value("${app.ai.max-retries:1}") int maxRetries,
            AiUsageRecorder usageRecorder) {
        this.meterRegistry = meterRegistry;
        this.timeoutSeconds = timeoutSeconds;
        this.maxRetries = maxRetries;
        this.usageRecorder = usageRecorder;
        this.executor = Executors.newFixedThreadPool(4, runnable -> {
            Thread thread = new Thread(runnable, "ai-call");
            thread.setDaemon(true);
            return thread;
        });
    }

    // Constructor de conveniencia para tests unitarios.
    public AiCallExecutor(MeterRegistry meterRegistry, long timeoutSeconds, int maxRetries) {
        this(meterRegistry, timeoutSeconds, maxRetries, AiUsageRecorder.noop(meterRegistry));
    }

    public <T> T call(String feature, Supplier<T> action) {
        Timer.Sample sample = Timer.start(meterRegistry);
        long startedAt = System.nanoTime();

        try {
            T result = executeWithRetry(feature, action);
            meterRegistry
                    .counter("ai.requests", "feature", feature, "outcome", "success")
                    .increment();
            log.info("AI feature={} outcome=success latencyMs={}", feature, elapsedMillis(startedAt));
            return result;
        } catch (RuntimeException ex) {
            meterRegistry
                    .counter("ai.requests", "feature", feature, "outcome", "error")
                    .increment();
            log.warn(
                    "AI feature={} outcome=error latencyMs={} error={}",
                    feature,
                    elapsedMillis(startedAt),
                    ex.getMessage());
            throw ex;
        } finally {
            sample.stop(meterRegistry.timer("ai.latency", "feature", feature));
        }
    }

    // Variante que conserva el ChatResponse para registrar usage/tokens/costo.
    public ChatResponse callChat(String feature, Supplier<ChatResponse> action) {
        ChatResponse response = call(feature, action);
        usageRecorder.record(feature, response);
        return response;
    }

    // Variante para salidas estructuradas: Spring AI devuelve en la misma llamada
    // la respuesta cruda (con usage) y la entidad ya deserializada.
    public <T> ResponseEntity<ChatResponse, T> callEntity(
            String feature, Supplier<ResponseEntity<ChatResponse, T>> action) {
        ResponseEntity<ChatResponse, T> result = call(feature, action);
        if (result != null) {
            usageRecorder.record(feature, result.response());
        }
        return result;
    }

    // Streaming: el timeout se aplica al flujo y el usage se registra una sola vez al
    // completar, tomando el maximo acumulado (Anthropic reporta el input al inicio y
    // el output de forma acumulativa en cada delta).
    public Flux<ChatResponse> stream(String feature, Supplier<Flux<ChatResponse>> action) {
        Timer.Sample sample = Timer.start(meterRegistry);
        long startedAt = System.nanoTime();
        UsageAccumulator usage = new UsageAccumulator();

        return Flux.defer(action)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .onErrorMap(
                        TimeoutException.class,
                        ex -> new AiUnavailableException(
                                "El asistente de IA excedio el tiempo de espera de " + timeoutSeconds + " segundos."))
                .onErrorMap(
                        ex -> !(ex instanceof AiUnavailableException),
                        ex -> new AiUnavailableException("El asistente de IA no esta disponible en este momento.", ex))
                .doOnNext(usage::accept)
                .doOnComplete(() -> {
                    usage.record(usageRecorder, feature);
                    meterRegistry
                            .counter("ai.requests", "feature", feature, "outcome", "success")
                            .increment();
                    log.info(
                            "AI feature={} outcome=success stream=true latencyMs={}",
                            feature,
                            elapsedMillis(startedAt));
                })
                .doOnError(ex -> {
                    meterRegistry
                            .counter("ai.requests", "feature", feature, "outcome", "error")
                            .increment();
                    log.warn(
                            "AI feature={} outcome=error stream=true latencyMs={} error={}",
                            feature,
                            elapsedMillis(startedAt),
                            ex.getMessage());
                })
                .doFinally(signal -> sample.stop(meterRegistry.timer("ai.latency", "feature", feature)));
    }

    private <T> T executeWithRetry(String feature, Supplier<T> action) {
        for (int attempt = 0; ; attempt++) {
            Future<T> future = executor.submit(action::get);
            try {
                return future.get(timeoutSeconds, TimeUnit.SECONDS);
            } catch (TimeoutException ex) {
                future.cancel(true);
                throw new AiUnavailableException(
                        "El asistente de IA excedio el tiempo de espera de " + timeoutSeconds + " segundos.");
            } catch (ExecutionException ex) {
                if (attempt >= maxRetries) {
                    throw new AiUnavailableException(
                            "El asistente de IA no esta disponible en este momento.", ex.getCause());
                }
                log.warn("AI feature={} fallo en el intento {} — reintentando", feature, attempt + 1);
                sleepBeforeRetry(attempt);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                throw new AiUnavailableException("La llamada a la IA fue interrumpida.", ex);
            }
        }
    }

    private void sleepBeforeRetry(int attempt) {
        try {
            Thread.sleep(200L * (attempt + 1));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new AiUnavailableException("La llamada a la IA fue interrumpida.", ex);
        }
    }

    private long elapsedMillis(long startedAt) {
        return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt);
    }

    private static final class UsageAccumulator {
        private Integer promptTokens;
        private Integer completionTokens;
        private String model;

        synchronized void accept(ChatResponse response) {
            if (response == null) {
                return;
            }
            ChatResponseMetadata metadata = response.getMetadata();
            if (metadata == null) {
                return;
            }
            if (metadata.getModel() != null && !metadata.getModel().isBlank()) {
                model = metadata.getModel();
            }
            Usage usage = metadata.getUsage();
            if (usage == null) {
                return;
            }
            promptTokens = max(promptTokens, usage.getPromptTokens());
            completionTokens = max(completionTokens, usage.getCompletionTokens());
        }

        synchronized void record(AiUsageRecorder recorder, String feature) {
            if (promptTokens == null && completionTokens == null) {
                recorder.record(feature, (ChatResponse) null);
                return;
            }
            recorder.record(
                    feature,
                    model,
                    promptTokens != null ? promptTokens : 0,
                    completionTokens != null ? completionTokens : 0);
        }

        private static Integer max(Integer current, Integer candidate) {
            if (candidate == null) {
                return current;
            }
            return current == null ? candidate : Math.max(current, candidate);
        }
    }
}
