package com.fepdev.sfm.backend.ai.guard;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;

// Envuelve cada llamada a un LLM con timeout, reintento y metricas.
// No se reintenta un timeout: si el modelo tarda mas de la cuenta, insistir solo
// empeora la latencia percibida por el usuario.
@Component
public class AiCallExecutor {

    private static final Logger log = LoggerFactory.getLogger(AiCallExecutor.class);

    private final MeterRegistry meterRegistry;
    private final ExecutorService executor;
    private final long timeoutSeconds;
    private final int maxRetries;

    public AiCallExecutor(MeterRegistry meterRegistry,
            @Value("${app.ai.timeout-seconds:30}") long timeoutSeconds,
            @Value("${app.ai.max-retries:1}") int maxRetries) {
        this.meterRegistry = meterRegistry;
        this.timeoutSeconds = timeoutSeconds;
        this.maxRetries = maxRetries;
        this.executor = Executors.newFixedThreadPool(4, runnable -> {
            Thread thread = new Thread(runnable, "ai-call");
            thread.setDaemon(true);
            return thread;
        });
    }

    public <T> T call(String feature, Supplier<T> action) {
        Timer.Sample sample = Timer.start(meterRegistry);
        long startedAt = System.nanoTime();

        try {
            T result = executeWithRetry(feature, action);
            meterRegistry.counter("ai.requests", "feature", feature, "outcome", "success").increment();
            log.info("AI feature={} outcome=success latencyMs={}", feature,
                    elapsedMillis(startedAt));
            return result;
        } catch (RuntimeException ex) {
            meterRegistry.counter("ai.requests", "feature", feature, "outcome", "error").increment();
            log.warn("AI feature={} outcome=error latencyMs={} error={}", feature,
                    elapsedMillis(startedAt), ex.getMessage());
            throw ex;
        } finally {
            sample.stop(meterRegistry.timer("ai.latency", "feature", feature));
        }
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
}
