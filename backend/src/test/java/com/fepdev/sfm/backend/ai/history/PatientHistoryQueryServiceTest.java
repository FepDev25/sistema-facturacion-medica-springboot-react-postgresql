package com.fepdev.sfm.backend.ai.history;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.ai.guard.AiCallExecutor;
import com.fepdev.sfm.backend.ai.history.dto.PatientHistoryAnswer;
import com.fepdev.sfm.backend.ai.history.dto.ReindexResponse;
import com.fepdev.sfm.backend.ai.support.AiTestFixtures;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecord;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecordRepository;
import com.fepdev.sfm.backend.domain.patient.PatientRepository;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import jakarta.persistence.EntityNotFoundException;
import reactor.core.publisher.Flux;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PatientHistoryQueryServiceTest {

    @Mock VectorStore vectorStore;
    @Mock ChatClient chatClient;
    @Mock ChatClient.ChatClientRequestSpec requestSpec;
    @Mock ChatClient.CallResponseSpec callSpec;
    @Mock ChatClient.StreamResponseSpec streamSpec;
    @Mock PatientHistoryIndexer indexer;
    @Mock PatientRepository patientRepository;
    @Mock MedicalRecordRepository medicalRecordRepository;
    @Mock PatientConversationMemory conversationMemory;

    private PatientHistoryQueryService service;
    private UUID patientId;

    @BeforeEach
    void setUp() {
        service = new PatientHistoryQueryService(vectorStore, chatClient,
                new AiCallExecutor(new SimpleMeterRegistry(), 5, 0), indexer,
                patientRepository, medicalRecordRepository, conversationMemory);
        patientId = UUID.randomUUID();

        lenient().when(chatClient.prompt()).thenReturn(requestSpec);
        lenient().when(requestSpec.system(anyString())).thenReturn(requestSpec);
        lenient().when(requestSpec.user(anyString())).thenReturn(requestSpec);
        lenient().when(requestSpec.call()).thenReturn(callSpec);
        lenient().when(requestSpec.stream()).thenReturn(streamSpec);
    }

    @Test
    void isSummaryQuery_matchesKnownPatterns() {
        assertThat(invokeIsSummaryQuery("historial completo del paciente")).isTrue();
        assertThat(invokeIsSummaryQuery("HISTORIAL MEDICO")).isTrue();
        assertThat(invokeIsSummaryQuery("todos los diagnosticos")).isTrue();
        assertThat(invokeIsSummaryQuery("condiciones cronicas")).isTrue();
        assertThat(invokeIsSummaryQuery("que medicamentos toma?")).isTrue();
        assertThat(invokeIsSummaryQuery("lista de procedimientos")).isTrue();
        assertThat(invokeIsSummaryQuery("enfermedades que padece")).isTrue();
        assertThat(invokeIsSummaryQuery("cuales son sus diagnosticos")).isTrue();
        assertThat(invokeIsSummaryQuery("antecedentes patologicos")).isTrue();
        assertThat(invokeIsSummaryQuery("que enfermedades tiene")).isTrue();
        assertThat(invokeIsSummaryQuery("tiene alguna enfermedad cronica")).isTrue();
    }

    @Test
    void isSummaryQuery_withAccents_stillMatches() {
        assertThat(invokeIsSummaryQuery("historial médico")).isTrue();
        assertThat(invokeIsSummaryQuery("diagnósticos conocidos")).isTrue();
        assertThat(invokeIsSummaryQuery("condiciones crónicas")).isTrue();
        assertThat(invokeIsSummaryQuery("resumen clínico")).isTrue();
        assertThat(invokeIsSummaryQuery("enfermedades crónicas")).isTrue();
        assertThat(invokeIsSummaryQuery("padecimientos crónicos")).isTrue();
        assertThat(invokeIsSummaryQuery("antecedentes clínicos")).isTrue();
    }

    @Test
    void isSummaryQuery_nonSummaryQuery_returnsFalse() {
        assertThat(invokeIsSummaryQuery("que medicamento tome en la cita de enero?")).isFalse();
        assertThat(invokeIsSummaryQuery("tuvo fiebre alta?")).isFalse();
        assertThat(invokeIsSummaryQuery("cual fue el resultado del laboratorio?")).isFalse();
        assertThat(invokeIsSummaryQuery("dolor abdominal agudo")).isFalse();
    }

    @Test
    void query_whenPatientNotFound_throwsEntityNotFoundException() {
        when(patientRepository.existsById(patientId)).thenReturn(false);

        assertThatThrownBy(() -> service.query(patientId, "diagnosticos?", "doctor1"))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("no encontrado");
    }

    @Test
    void query_usesVectorSearchAndReturnsSources() {
        stubPatientReady();
        UUID recordId = UUID.randomUUID();
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of(
                document(recordId, "2024-01-15", "Hipertension en tratamiento")));
        when(indexer.resolveTopK(patientId)).thenReturn(6);
        when(callSpec.chatResponse()).thenReturn(AiTestFixtures.response("Tiene hipertension.", 100, 20));

        PatientHistoryAnswer answer = service.query(patientId, "que diagnostico tiene?", "doctor1");

        assertThat(answer.answer()).isEqualTo("Tiene hipertension.");
        assertThat(answer.sources()).hasSize(1);
        assertThat(answer.sources().getFirst().medicalRecordId()).isEqualTo(recordId);
        verify(conversationMemory).append("doctor1", patientId, "que diagnostico tiene?",
                "Tiene hipertension.");
    }

    @Test
    void query_whenVectorSearchIsEmpty_doesNotCallTheModel() {
        stubPatientReady();
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of());

        PatientHistoryAnswer answer = service.query(patientId, "dolor lumbar", "doctor1");

        assertThat(answer.answer()).contains("No se encontraron expedientes");
        assertThat(answer.sources()).isEmpty();
        verify(chatClient, never()).prompt();
        verify(conversationMemory, never()).append(anyString(), any(), anyString(), anyString());
    }

    @Test
    void followUp_includesPreviousTurnAndUsesItForRetrieval() {
        stubPatientReady();
        when(conversationMemory.recent("doctor1", patientId)).thenReturn(List.of(
                new PatientConversationMemory.ConversationTurn(
                        "que medicamentos toma?", "Toma losartan 50 mg.", 1L)));
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of(
                document(UUID.randomUUID(), "2024-02-01", "Losartan 50 mg cada 24 horas")));
        when(callSpec.chatResponse()).thenReturn(AiTestFixtures.response("Desde enero de 2024.", 80, 10));

        service.query(patientId, "¿y desde cuándo?", "doctor1");

        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(requestSpec).user(promptCaptor.capture());
        assertThat(promptCaptor.getValue())
                .contains("Conversación previa")
                .contains("que medicamentos toma?")
                .contains("Toma losartan 50 mg.")
                .contains("¿y desde cuándo?");

        ArgumentCaptor<SearchRequest> searchCaptor = ArgumentCaptor.forClass(SearchRequest.class);
        verify(vectorStore).similaritySearch(searchCaptor.capture());
        assertThat(searchCaptor.getValue().getQuery())
                .contains("que medicamentos toma?")
                .contains("¿y desde cuándo?");
    }

    @Test
    void followUp_doesNotLeakTurnsFromAnotherUser() {
        stubPatientReady();
        when(conversationMemory.recent("doctor2", patientId)).thenReturn(List.of());
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of(
                document(UUID.randomUUID(), "2024-02-01", "Nota clinica")));
        when(callSpec.chatResponse()).thenReturn(AiTestFixtures.response("Respuesta", 10, 5));

        service.query(patientId, "¿y la dosis?", "doctor2");

        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(requestSpec).user(promptCaptor.capture());
        assertThat(promptCaptor.getValue()).doesNotContain("Conversación previa");
    }

    @Test
    void summaryQuery_buildsContextFromDatabase() {
        stubPatientReady();
        when(indexer.buildSummaryContext(patientId)).thenReturn("Diagnosticos: I10 Hipertension");
        MedicalRecord record = mock(MedicalRecord.class);
        when(record.getId()).thenReturn(UUID.randomUUID());
        when(record.getRecordDate()).thenReturn(OffsetDateTime.now());
        when(medicalRecordRepository.findByPatientId(eq(patientId), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(record)));
        when(callSpec.chatResponse()).thenReturn(AiTestFixtures.response("Resumen", 30, 10));

        PatientHistoryAnswer answer = service.query(patientId, "historial completo", "doctor1");

        assertThat(answer.answer()).isEqualTo("Resumen");
        assertThat(answer.sources()).hasSize(1);
    }

    @Test
    void summaryQuery_withoutRecords_returnsEmptyAnswer() {
        stubPatientReady();
        when(indexer.buildSummaryContext(patientId)).thenReturn("");

        PatientHistoryAnswer answer = service.query(patientId, "historial completo", "doctor1");

        assertThat(answer.answer()).contains("No se encontraron expedientes");
        verify(chatClient, never()).prompt();
    }

    @Test
    void query_whenModelReturnsNoContent_returnsEmptyAndDoesNotStore() {
        stubPatientReady();
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of(
                document(UUID.randomUUID(), "2024-01-01", "Nota")));
        when(callSpec.chatResponse()).thenReturn(new ChatResponse(List.of()));

        PatientHistoryAnswer answer = service.query(patientId, "dolor", "doctor1");

        assertThat(answer.answer()).isEmpty();
        verify(conversationMemory, never()).append(anyString(), any(), anyString(), anyString());
    }

    @Test
    void streamQuery_emitsTokensAndStoresCompletedAnswer() throws Exception {
        stubPatientReady();
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of(
                document(UUID.randomUUID(), "2024-01-01", "Nota")));
        when(streamSpec.chatResponse()).thenReturn(Flux.just(
                AiTestFixtures.response("Hola ", 50, 1),
                AiTestFixtures.response("mundo", 50, 4)));

        List<String> tokens = new CopyOnWriteArrayList<>();
        AtomicReference<PatientHistoryAnswer> completed = new AtomicReference<>();
        CountDownLatch latch = new CountDownLatch(1);

        service.streamQuery(patientId, "resumen del dolor", "doctor1",
                tokens::add, answer -> {
                    completed.set(answer);
                    latch.countDown();
                }, error -> latch.countDown());

        assertThat(latch.await(3, TimeUnit.SECONDS)).isTrue();
        assertThat(String.join("", tokens)).isEqualTo("Hola mundo");
        assertThat(completed.get().answer()).isEqualTo("Hola mundo");
        verify(conversationMemory).append("doctor1", patientId, "resumen del dolor", "Hola mundo");
    }

    @Test
    void streamQuery_withoutRecordsCompletesImmediately() {
        stubPatientReady();
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of());

        AtomicReference<PatientHistoryAnswer> completed = new AtomicReference<>();
        service.streamQuery(patientId, "dolor", "doctor1", token -> { },
                completed::set, error -> { });

        assertThat(completed.get().answer()).contains("No se encontraron expedientes");
        verify(streamSpec, never()).chatResponse();
    }

    @Test
    void streamQuery_providerErrorIsForwarded() throws Exception {
        stubPatientReady();
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of(
                document(UUID.randomUUID(), "2024-01-01", "Nota")));
        when(streamSpec.chatResponse()).thenReturn(
                Flux.error(new IllegalStateException("provider down")));

        AtomicReference<Throwable> error = new AtomicReference<>();
        CountDownLatch latch = new CountDownLatch(1);
        service.streamQuery(patientId, "dolor", "doctor1", token -> { },
                answer -> latch.countDown(), throwable -> {
                    error.set(throwable);
                    latch.countDown();
                });

        assertThat(latch.await(3, TimeUnit.SECONDS)).isTrue();
        assertThat(error.get()).hasMessageContaining("no esta disponible");
        verify(conversationMemory, never()).append(anyString(), any(), anyString(), anyString());
    }

    @Test
    void clearConversation_validatesPatientAndClearsMemory() {
        when(patientRepository.existsById(patientId)).thenReturn(true);

        service.clearConversation(patientId, "doctor1");

        verify(conversationMemory).clear("doctor1", patientId);
    }

    @Test
    void clearConversation_unknownPatientThrows() {
        when(patientRepository.existsById(patientId)).thenReturn(false);

        assertThatThrownBy(() -> service.clearConversation(patientId, "doctor1"))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void reindex_returnsIndexedCount() {
        when(patientRepository.existsById(patientId)).thenReturn(true);
        when(indexer.indexPatient(patientId)).thenReturn(4);

        ReindexResponse response = service.reindex(patientId);

        assertThat(response.recordsIndexed()).isEqualTo(4);
    }

    private void stubPatientReady() {
        when(patientRepository.existsById(patientId)).thenReturn(true);
        when(indexer.isPatientFullyIndexed(patientId)).thenReturn(true);
        when(conversationMemory.recent(anyString(), any())).thenReturn(List.of());
        lenient().when(indexer.resolveTopK(patientId)).thenReturn(6);
    }

    private Document document(UUID recordId, String date, String text) {
        return new Document(text, Map.of(
                "medicalRecordId", recordId.toString(),
                "recordDate", date,
                "patientId", patientId.toString()));
    }

    private boolean invokeIsSummaryQuery(String question) {
        return ReflectionTestUtils.invokeMethod(service, "isSummaryQuery", question);
    }
}
