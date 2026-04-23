package com.fepdev.sfm.backend.ai.icd10;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import com.fepdev.sfm.backend.ai.icd10.dto.Icd10Suggestion;
import com.fepdev.sfm.backend.ai.icd10.dto.Icd10SuggestionResult;

@Service
public class Icd10SuggestionService {

    private record RerankResult(List<String> codes) {}

    private static final String SYSTEM_PROMPT = """
            Eres un experto en codificación diagnóstica CIE-10. Se te proporciona una descripción clínica
            y una lista de códigos candidatos recuperados por búsqueda semántica.

            Tu tarea: selecciona los 5 códigos más apropiados para esa descripción clínica, en orden de relevancia.
            Devuelve solo los códigos exactamente como aparecen en la lista (ej. "I10", "G44.8").
            No inventes códigos que no estén en la lista de candidatos.
            """;

    private final VectorStore vectorStore;
    private final ChatClient chatClient;

    public Icd10SuggestionService(VectorStore vectorStore, ChatClient chatClient) {
        this.vectorStore = vectorStore;
        this.chatClient = chatClient;
    }

    public Icd10SuggestionResult suggest(String query) {
        // 1. Vector search: recuperar top-10 candidatos
        List<Document> candidates = vectorStore.similaritySearch(
                SearchRequest.builder().query(query).topK(25).build());

        if (candidates.isEmpty()) {
            return new Icd10SuggestionResult(List.of());
        }

        // 2. Mapa código → documento para lookup posterior
        Map<String, Document> byCode = candidates.stream()
                .collect(Collectors.toMap(
                        doc -> (String) doc.getMetadata().get("code"),
                        doc -> doc,
                        (a, b) -> a));

        // 3. Construir lista de candidatos para el prompt
        String candidateList = IntStream.range(0, candidates.size())
                .mapToObj(i -> {
                    Document doc = candidates.get(i);
                    return (i + 1) + ". " + doc.getMetadata().get("code") + " — " + doc.getText();
                })
                .collect(Collectors.joining("\n"));

        String userPrompt = """
                Descripción clínica: "%s"

                Candidatos CIE-10:
                %s

                Selecciona los 5 códigos más apropiados, en orden de relevancia.
                """.formatted(query, candidateList);

        // 4. Reranking con Claude
        RerankResult reranked = chatClient.prompt()
                .system(SYSTEM_PROMPT)
                .user(userPrompt)
                .call()
                .entity(RerankResult.class);

        if (reranked == null || reranked.codes() == null) {
            return new Icd10SuggestionResult(List.of());
        }

        // 5. Mapear de vuelta a sugerencias con score original del vector search
        List<Icd10Suggestion> suggestions = reranked.codes().stream()
                .map(code -> {
                    Document doc = byCode.get(code);
                    if (doc == null) return null;
                    return new Icd10Suggestion(code, doc.getText(), doc.getScore());
                })
                .filter(Objects::nonNull)
                .limit(5)
                .toList();

        return new Icd10SuggestionResult(suggestions);
    }
}
