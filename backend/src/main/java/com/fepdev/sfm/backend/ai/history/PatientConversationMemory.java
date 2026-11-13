package com.fepdev.sfm.backend.ai.history;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

// Memoria conversacional de P3.
//
// La clave incluye SIEMPRE userId y patientId: un usuario no puede recuperar turnos
// de otro usuario ni de otro paciente. TTL configurable (por defecto 30 min) para
// limitar la retencion de texto clinico. Si Redis no responde se usa un buffer local
// por instancia, de modo que el chat sigue funcionando en un solo dyno.
@Component
public class PatientConversationMemory {

    private static final Logger log = LoggerFactory.getLogger(PatientConversationMemory.class);
    private static final String KEY_PREFIX = "sfm:ai:conversation:";
    private static final int MAX_TRACKED_KEYS = 5_000;

    public record ConversationTurn(String question, String answer, long createdAtEpochMillis) {}

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final Duration ttl;
    private final int maxTurns;
    private final ConcurrentHashMap<String, Deque<ConversationTurn>> fallback = new ConcurrentHashMap<>();

    @Autowired
    public PatientConversationMemory(ObjectProvider<StringRedisTemplate> redisProvider,
            ObjectMapper objectMapper,
            @Value("${app.ai.memory.ttl-seconds:1800}") long ttlSeconds,
            @Value("${app.ai.memory.max-turns:6}") int maxTurns) {
        this(redisProvider.getIfAvailable(), objectMapper, ttlSeconds, maxTurns);
    }

    // Constructor explicito para tests (redisTemplate puede ser null).
    public PatientConversationMemory(StringRedisTemplate redisTemplate, ObjectMapper objectMapper,
            long ttlSeconds, int maxTurns) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.ttl = Duration.ofSeconds(Math.max(60, ttlSeconds));
        this.maxTurns = Math.max(1, maxTurns);
    }

    public List<ConversationTurn> recent(String userId, UUID patientId) {
        String key = key(userId, patientId);
        try {
            if (redisTemplate != null) {
                List<String> raw = redisTemplate.opsForList().range(key, -maxTurns, -1);
                return deserialize(raw);
            }
        } catch (RuntimeException ex) {
            log.warn("Memoria conversacional no disponible en Redis; usando memoria local: {}",
                    ex.getMessage());
        }
        return localRecent(key);
    }

    public void append(String userId, UUID patientId, String question, String answer) {
        if (question == null || question.isBlank() || answer == null || answer.isBlank()) {
            return;
        }
        String key = key(userId, patientId);
        ConversationTurn turn = new ConversationTurn(question, answer, System.currentTimeMillis());
        try {
            if (redisTemplate != null) {
                redisTemplate.opsForList().rightPush(key, serialize(turn));
                redisTemplate.opsForList().trim(key, -maxTurns, -1);
                redisTemplate.expire(key, ttl);
                return;
            }
        } catch (RuntimeException ex) {
            log.warn("No se pudo guardar la conversacion en Redis; usando memoria local: {}",
                    ex.getMessage());
        }
        localAppend(key, turn);
    }

    public void clear(String userId, UUID patientId) {
        String key = key(userId, patientId);
        try {
            if (redisTemplate != null) {
                redisTemplate.delete(key);
            }
        } catch (RuntimeException ex) {
            log.debug("No se pudo limpiar la conversacion en Redis: {}", ex.getMessage());
        }
        fallback.remove(key);
    }

    public int getMaxTurns() {
        return maxTurns;
    }

    public long getTtlSeconds() {
        return ttl.toSeconds();
    }

    static String key(String userId, UUID patientId) {
        String normalizedUser = userId == null || userId.isBlank()
                ? "anonymous"
                : userId.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9._@-]", "_");
        return KEY_PREFIX + normalizedUser + ":" + patientId;
    }

    private List<ConversationTurn> deserialize(List<String> raw) {
        if (raw == null || raw.isEmpty()) {
            return List.of();
        }
        List<ConversationTurn> turns = new ArrayList<>(raw.size());
        for (String json : raw) {
            try {
                turns.add(objectMapper.readValue(json, ConversationTurn.class));
            } catch (JacksonException ex) {
                log.warn("Turno de conversacion corrupto en Redis; se ignora: {}", ex.getMessage());
            }
        }
        return List.copyOf(turns);
    }

    private String serialize(ConversationTurn turn) {
        try {
            return objectMapper.writeValueAsString(turn);
        } catch (JacksonException ex) {
            throw new IllegalStateException("No se pudo serializar el turno de conversacion", ex);
        }
    }

    private List<ConversationTurn> localRecent(String key) {
        Deque<ConversationTurn> turns = fallback.get(key);
        if (turns == null) {
            return List.of();
        }
        synchronized (turns) {
            return List.copyOf(turns);
        }
    }

    private void localAppend(String key, ConversationTurn turn) {
        if (fallback.size() > MAX_TRACKED_KEYS) {
            fallback.clear();
        }
        Deque<ConversationTurn> turns = fallback.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        synchronized (turns) {
            turns.addLast(turn);
            while (turns.size() > maxTurns) {
                turns.removeFirst();
            }
        }
    }
}
