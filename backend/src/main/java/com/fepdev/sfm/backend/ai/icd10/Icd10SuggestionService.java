package com.fepdev.sfm.backend.ai.icd10;

import com.fepdev.sfm.backend.ai.guard.AiCallExecutor;
import com.fepdev.sfm.backend.ai.icd10.dto.Icd10Suggestion;
import com.fepdev.sfm.backend.ai.icd10.dto.Icd10SuggestionResult;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.ResponseEntity;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

@Service
public class Icd10SuggestionService {

    private static final Logger log = LoggerFactory.getLogger(Icd10SuggestionService.class);

    record RerankResult(List<String> codes) {}

    private static final String NORMALIZE_PROMPT = """
            Eres experto en codificación CIE-10. El médico escribió una descripción clínica en lenguaje coloquial.
            Convierte la descripción clínica a terminología médica formal CIE-10.
            Incluye TODAS las condiciones, diagnósticos y síntomas mencionados.
            Omite únicamente el mecanismo accidental de cómo ocurrió una lesión (caídas, golpes, accidentes vehiculares).
            No omitas diagnósticos activos.
            Devuelve solo la versión normalizada, sin explicaciones.
            """;

    private static final String RERANK_PROMPT = """
            Eres un experto en codificación diagnóstica CIE-10. Se te proporciona una descripción clínica
            y una lista de códigos candidatos recuperados por búsqueda semántica.

            Tu tarea: selecciona los 5 códigos más apropiados para esa descripción clínica, en orden de relevancia.
            Devuelve solo los códigos exactamente como aparecen en la lista (ej. "I10", "G44.8").
            No inventes códigos que no estén en la lista de candidatos.
            """;

    private final VectorStore vectorStore;
    private final ChatClient chatClient;
    private final AiCallExecutor aiCallExecutor;

    public Icd10SuggestionService(VectorStore vectorStore, ChatClient chatClient, AiCallExecutor aiCallExecutor) {
        this.vectorStore = vectorStore;
        this.chatClient = chatClient;
        this.aiCallExecutor = aiCallExecutor;
    }

    public Icd10SuggestionResult suggest(String query) {
        // 1. Normalizar la query a terminología CIE-10 formal
        ChatResponse normalization = aiCallExecutor.callChat(
                "icd10-normalize",
                () -> chatClient
                        .prompt()
                        .system(NORMALIZE_PROMPT)
                        .user(query)
                        .call()
                        .chatResponse());
        String normalizedQuery = contentOf(normalization);

        if (normalizedQuery == null || normalizedQuery.isBlank()) {
            normalizedQuery = query;
        }

        log.debug("suggest — query original: '{}' | normalizada: '{}'", query, normalizedQuery);

        // 2. Vector search con la query normalizada
        List<Document> candidates = vectorStore.similaritySearch(
                SearchRequest.builder().query(normalizedQuery).topK(20).build());

        if (candidates.isEmpty()) {
            return new Icd10SuggestionResult(List.of());
        }

        // 3. Mapa código → documento para lookup posterior
        Map<String, Document> byCode = candidates.stream()
                .collect(Collectors.toMap(doc -> (String) doc.getMetadata().get("code"), doc -> doc, (a, b) -> a));

        // 4. Construir lista de candidatos para el reranking
        String candidateList = IntStream.range(0, candidates.size())
                .mapToObj(i -> {
                    Document doc = candidates.get(i);
                    return (i + 1) + ". " + doc.getMetadata().get("code") + " — " + doc.getText();
                })
                .collect(Collectors.joining("\n"));

        String rerankPrompt = """
                Descripción clínica original: "%s"
                Descripción normalizada: "%s"

                Candidatos CIE-10:
                %s

                Selecciona los 5 códigos más apropiados, en orden de relevancia.
                """.formatted(query, normalizedQuery, candidateList);

        // 5. Reranking con Claude
        ResponseEntity<ChatResponse, RerankResult> rerankResponse = aiCallExecutor.callEntity(
                "icd10-rerank",
                () -> chatClient
                        .prompt()
                        .system(RERANK_PROMPT)
                        .user(rerankPrompt)
                        .call()
                        .responseEntity(RerankResult.class));
        RerankResult reranked = rerankResponse != null ? rerankResponse.entity() : null;

        if (reranked == null || reranked.codes() == null || reranked.codes().isEmpty()) {
            log.warn(
                    "Reranking retornó vacío — query='{}' normalizada='{}' — usando candidatos del vector search como fallback",
                    query,
                    normalizedQuery);
            List<Icd10Suggestion> fallback = candidates.stream()
                    .map(doc ->
                            new Icd10Suggestion((String) doc.getMetadata().get("code"), doc.getText(), doc.getScore()))
                    .limit(5)
                    .toList();
            return new Icd10SuggestionResult(fallback);
        }

        // 6. Mapear de vuelta preservando el score original del vector search
        List<Icd10Suggestion> suggestions = reranked.codes().stream()
                .map(code -> {
                    Document doc = byCode.get(code);
                    if (doc == null) {
                        log.warn("Reranking devolvió código '{}' que no está en el pool de candidatos", code);
                        return null;
                    }
                    return new Icd10Suggestion(code, doc.getText(), doc.getScore());
                })
                .filter(Objects::nonNull)
                .limit(5)
                .toList();

        return new Icd10SuggestionResult(suggestions);
    }

    private static String contentOf(ChatResponse response) {
        if (response == null
                || response.getResult() == null
                || response.getResult().getOutput() == null) {
            return null;
        }
        return response.getResult().getOutput().getText();
    }
}
