package com.fepdev.sfm.backend.ai.icd10;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fepdev.sfm.backend.ai.guard.AiCallExecutor;
import com.fepdev.sfm.backend.ai.guard.AiUnavailableException;
import com.fepdev.sfm.backend.ai.icd10.dto.Icd10SuggestionResult;
import com.fepdev.sfm.backend.ai.support.AiTestFixtures;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.ResponseEntity;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class Icd10SuggestionServiceTest {

    @Mock
    VectorStore vectorStore;

    @Mock
    ChatClient chatClient;

    @Mock
    ChatClient.ChatClientRequestSpec requestSpec;

    @Mock
    ChatClient.CallResponseSpec callSpec;

    private Icd10SuggestionService service;

    @BeforeEach
    void setUp() {
        service = new Icd10SuggestionService(
                vectorStore, chatClient, new AiCallExecutor(new SimpleMeterRegistry(), 5, 0));

        lenient().when(chatClient.prompt()).thenReturn(requestSpec);
        lenient().when(requestSpec.system(anyString())).thenReturn(requestSpec);
        lenient().when(requestSpec.user(anyString())).thenReturn(requestSpec);
        lenient().when(requestSpec.call()).thenReturn(callSpec);
    }

    @Test
    void service_isCreated() {
        assertThat(service).isNotNull();
    }

    @Test
    void suggest_returnsEmptyWhenVectorSearchFindsNothing() {
        stubNormalization("Hipertension arterial");
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of());

        Icd10SuggestionResult result = service.suggest("presion alta");

        assertThat(result.suggestions()).isEmpty();
        verify(callSpec, never()).responseEntity(Icd10SuggestionService.RerankResult.class);
    }

    @Test
    void suggest_mapsRerankedCodesAndKeepsVectorScore() {
        stubNormalization("Hipertension arterial esencial");
        Document i10 = document("I10", "Hipertension esencial", 0.95);
        Document i119 = document("I11.9", "Enfermedad cardiaca hipertensiva", 0.81);
        Document r030 = document("R03.0", "Presion arterial elevada", 0.70);
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of(i10, i119, r030));
        stubRerank(new Icd10SuggestionService.RerankResult(List.of("I10", "I11.9", "NO-EXISTE")));

        Icd10SuggestionResult result = service.suggest("presion alta");

        assertThat(result.suggestions()).extracting("code").containsExactly("I10", "I11.9");
        assertThat(result.suggestions().get(0).score()).isEqualTo(0.95);
    }

    @Test
    void suggest_fallsBackToCandidatesWhenRerankIsEmpty() {
        stubNormalization("Hipertension");
        Document i10 = document("I10", "Hipertension esencial", 0.95);
        Document i119 = document("I11.9", "Cardiopatia hipertensiva", 0.80);
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of(i10, i119));
        stubRerank(new Icd10SuggestionService.RerankResult(List.of()));

        Icd10SuggestionResult result = service.suggest("presion alta");

        assertThat(result.suggestions()).extracting("code").containsExactly("I10", "I11.9");
    }

    @Test
    void suggest_fallsBackToCandidatesWhenRerankResultIsNull() {
        stubNormalization("Hipertension");
        Document i10 = document("I10", "Hipertension esencial", 0.95);
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of(i10));
        when(callSpec.responseEntity(Icd10SuggestionService.RerankResult.class)).thenReturn(null);

        Icd10SuggestionResult result = service.suggest("presion alta");

        assertThat(result.suggestions())
                .singleElement()
                .satisfies(item -> assertThat(item.code()).isEqualTo("I10"));
    }

    @Test
    void suggest_usesOriginalQueryWhenNormalizationIsBlank() {
        when(callSpec.chatResponse()).thenReturn(AiTestFixtures.response(" "));
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of());

        service.suggest("dolor de cabeza");

        ArgumentCaptor<SearchRequest> captor = ArgumentCaptor.forClass(SearchRequest.class);
        verify(vectorStore).similaritySearch(captor.capture());
        assertThat(captor.getValue().getQuery()).isEqualTo("dolor de cabeza");
    }

    @Test
    void suggest_usesOriginalQueryWhenNormalizationHasNoResult() {
        when(callSpec.chatResponse()).thenReturn(new ChatResponse(List.of()));
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of());

        service.suggest("dolor lumbar");

        ArgumentCaptor<SearchRequest> captor = ArgumentCaptor.forClass(SearchRequest.class);
        verify(vectorStore).similaritySearch(captor.capture());
        assertThat(captor.getValue().getQuery()).isEqualTo("dolor lumbar");
    }

    @Test
    void suggest_propagatesProviderFailureDuringNormalization() {
        when(callSpec.chatResponse()).thenThrow(new IllegalStateException("provider down"));

        assertThatThrownBy(() -> service.suggest("presion alta"))
                .isInstanceOf(AiUnavailableException.class)
                .hasMessageContaining("no esta disponible");
    }

    @Test
    void suggest_limitsRerankedSuggestionsToFive() {
        stubNormalization("Hipertension");
        List<Document> candidates = List.of(
                document("A", "A", 0.9), document("B", "B", 0.8),
                document("C", "C", 0.7), document("D", "D", 0.6),
                document("E", "E", 0.5), document("F", "F", 0.4));
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(candidates);
        stubRerank(new Icd10SuggestionService.RerankResult(List.of("A", "B", "C", "D", "E", "F")));

        assertThat(service.suggest("x").suggestions()).hasSize(5);
    }

    private void stubNormalization(String normalized) {
        when(callSpec.chatResponse()).thenReturn(AiTestFixtures.response(normalized));
    }

    private void stubRerank(Icd10SuggestionService.RerankResult rerank) {
        ChatResponse response = AiTestFixtures.response("{}", 100, 20);
        when(callSpec.responseEntity(Icd10SuggestionService.RerankResult.class))
                .thenReturn(new ResponseEntity<>(response, rerank));
    }

    private Document document(String code, String text, double score) {
        Document document = mock(Document.class);
        when(document.getMetadata()).thenReturn(Map.of("code", code));
        when(document.getText()).thenReturn(text);
        when(document.getScore()).thenReturn(score);
        return document;
    }
}
