package com.fepdev.sfm.backend.ai.history;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecordRepository;
import com.fepdev.sfm.backend.domain.patient.PatientRepository;

import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
class PatientHistoryQueryServiceTest {

    @Mock org.springframework.ai.vectorstore.VectorStore vectorStore;
    @Mock org.springframework.ai.chat.client.ChatClient chatClient;
    @Mock PatientHistoryIndexer indexer;
    @Mock PatientRepository patientRepository;
    @Mock MedicalRecordRepository medicalRecordRepository;

    private PatientHistoryQueryService buildService() {
        return new PatientHistoryQueryService(vectorStore, chatClient, indexer,
                patientRepository, medicalRecordRepository);
    }

    @Test
    void isSummaryQuery_matchesKnownPatterns() {
        var svc = buildService();

        assertThat(invokeIsSummaryQuery(svc, "historial completo del paciente")).isTrue();
        assertThat(invokeIsSummaryQuery(svc, "HISTORIAL MEDICO")).isTrue();
        assertThat(invokeIsSummaryQuery(svc, "todos los diagnosticos")).isTrue();
        assertThat(invokeIsSummaryQuery(svc, "condiciones cronicas")).isTrue();
        assertThat(invokeIsSummaryQuery(svc, "que medicamentos toma?")).isTrue();
        assertThat(invokeIsSummaryQuery(svc, "lista de procedimientos")).isTrue();
        assertThat(invokeIsSummaryQuery(svc, "enfermedades que padece")).isTrue();
        assertThat(invokeIsSummaryQuery(svc, "cuales son sus diagnosticos")).isTrue();
        assertThat(invokeIsSummaryQuery(svc, "antecedentes patologicos")).isTrue();
        assertThat(invokeIsSummaryQuery(svc, "que enfermedades tiene")).isTrue();
        assertThat(invokeIsSummaryQuery(svc, "tiene alguna enfermedad cronica")).isTrue();
    }

    @Test
    void isSummaryQuery_withAccents_stillMatches() {
        var svc = buildService();

        assertThat(invokeIsSummaryQuery(svc, "historial médico")).isTrue();
        assertThat(invokeIsSummaryQuery(svc, "diagnósticos conocidos")).isTrue();
        assertThat(invokeIsSummaryQuery(svc, "condiciones crónicas")).isTrue();
        assertThat(invokeIsSummaryQuery(svc, "resumen clínico")).isTrue();
        assertThat(invokeIsSummaryQuery(svc, "enfermedades crónicas")).isTrue();
        assertThat(invokeIsSummaryQuery(svc, "padecimientos crónicos")).isTrue();
        assertThat(invokeIsSummaryQuery(svc, "antecedentes clínicos")).isTrue();
    }

    @Test
    void isSummaryQuery_nonSummaryQuery_returnsFalse() {
        var svc = buildService();

        assertThat(invokeIsSummaryQuery(svc, "que medicamento tome en la cita de enero?")).isFalse();
        assertThat(invokeIsSummaryQuery(svc, "tuvo fiebre alta?")).isFalse();
        assertThat(invokeIsSummaryQuery(svc, "cual fue el resultado del laboratorio?")).isFalse();
        assertThat(invokeIsSummaryQuery(svc, "dolor abdominal agudo")).isFalse();
    }

    @Test
    void query_whenPatientNotFound_throwsEntityNotFoundException() {
        var svc = buildService();
        UUID patientId = UUID.randomUUID();
        when(patientRepository.existsById(patientId)).thenReturn(false);

        assertThatThrownBy(() -> svc.query(patientId, "diagnosticos?"))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("no encontrado");
    }

    private boolean invokeIsSummaryQuery(PatientHistoryQueryService svc, String question) {
        return ReflectionTestUtils.invokeMethod(svc, "isSummaryQuery", question);
    }
}
