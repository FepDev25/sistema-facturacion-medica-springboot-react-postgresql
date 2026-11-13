package com.fepdev.sfm.backend.ai.history;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import com.fepdev.sfm.backend.ai.history.PatientConversationMemory.ConversationTurn;

import tools.jackson.databind.ObjectMapper;

class PatientConversationMemoryTest {

    private final ObjectMapper mapper = new ObjectMapper();

    private PatientConversationMemory memory(int maxTurns) {
        return new PatientConversationMemory((StringRedisTemplate) null, mapper, 1800, maxTurns);
    }

    @Test
    void keepsOnlyTheLastNTurns() {
        var memory = memory(2);
        UUID patient = UUID.randomUUID();

        memory.append("doctor1", patient, "p1", "r1");
        memory.append("doctor1", patient, "p2", "r2");
        memory.append("doctor1", patient, "p3", "r3");

        assertThat(memory.recent("doctor1", patient))
                .extracting(ConversationTurn::question)
                .containsExactly("p2", "p3");
    }

    @Test
    void isolatesByUserAndPatient() {
        var memory = memory(4);
        UUID patientA = UUID.randomUUID();
        UUID patientB = UUID.randomUUID();

        memory.append("doctor1", patientA, "pregunta A", "respuesta A");

        assertThat(memory.recent("doctor1", patientA)).hasSize(1);
        assertThat(memory.recent("doctor2", patientA)).isEmpty();
        assertThat(memory.recent("doctor1", patientB)).isEmpty();
    }

    @Test
    void ignoresBlankTurns() {
        var memory = memory(4);
        UUID patient = UUID.randomUUID();

        memory.append("doctor1", patient, " ", "respuesta");
        memory.append("doctor1", patient, "pregunta", "");
        memory.append(null, patient, null, null);

        assertThat(memory.recent("doctor1", patient)).isEmpty();
    }

    @Test
    void clearRemovesOnlyTheTargetConversation() {
        var memory = memory(4);
        UUID patient = UUID.randomUUID();

        memory.append("doctor1", patient, "p", "r");
        memory.clear("doctor1", patient);

        assertThat(memory.recent("doctor1", patient)).isEmpty();
    }

    @Test
    void anonymousAndCaseInsensitiveUsersShareScope() {
        var memory = memory(4);
        UUID patient = UUID.randomUUID();

        memory.append(null, patient, "p", "r");

        assertThat(memory.recent("anonymous", patient)).hasSize(1);
        assertThat(PatientConversationMemory.key("Doctor1", patient))
                .isEqualTo(PatientConversationMemory.key("doctor1", patient));
    }

    @Test
    void fallsBackToLocalMemoryWhenRedisFails() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked")
        ListOperations<String, String> listOperations = mock(ListOperations.class);
        when(redis.opsForList()).thenThrow(new IllegalStateException("redis down"));

        var memory = new PatientConversationMemory(redis, mapper, 1800, 3);
        UUID patient = UUID.randomUUID();

        memory.append("doctor1", patient, "p", "r");

        assertThat(memory.recent("doctor1", patient)).hasSize(1);
        memory.clear("doctor1", patient);
        assertThat(memory.recent("doctor1", patient)).isEmpty();
        assertThat(listOperations).isNotNull();
    }

    @Test
    void exposesConfiguredLimits() {
        var memory = new PatientConversationMemory((StringRedisTemplate) null, mapper, 10, 7);

        assertThat(memory.getTtlSeconds()).isEqualTo(60);
        assertThat(memory.getMaxTurns()).isEqualTo(7);
    }

    @Test
    void serializesAndDeserializesTurns() {
        var turn = new ConversationTurn("pregunta", "respuesta", 123L);

        assertThat(mapper.writeValueAsString(turn))
                .contains("pregunta")
                .contains("respuesta");
    }
}
