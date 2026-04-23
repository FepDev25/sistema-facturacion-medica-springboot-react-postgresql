package com.fepdev.sfm.backend.ai.history;

import java.util.List;
import java.util.UUID;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import com.fepdev.sfm.backend.ai.history.dto.HistorySource;
import com.fepdev.sfm.backend.ai.history.dto.PatientHistoryAnswer;
import com.fepdev.sfm.backend.domain.patient.PatientRepository;

import jakarta.persistence.EntityNotFoundException;

@Service
public class PatientHistoryQueryService {

    private static final String SYSTEM_PROMPT = """
            Eres un asistente médico clínico. Se te proporciona el historial clínico de un paciente.
            Responde la pregunta del médico o personal clínico basándote únicamente en los expedientes proporcionados.

            Reglas:
            - Basa tu respuesta SOLO en los expedientes clínicos proporcionados
            - Si la información no está en el historial, indícalo claramente
            - No inventes diagnósticos, medicamentos ni procedimientos que no estén en el contexto
            - Responde de forma concisa y clínica
            - Puedes citar fechas de expedientes para contextualizar la respuesta
            """;

    private final VectorStore vectorStore;
    private final ChatClient chatClient;
    private final PatientHistoryIndexer indexer;
    private final PatientRepository patientRepository;

    public PatientHistoryQueryService(VectorStore vectorStore, ChatClient chatClient,
            PatientHistoryIndexer indexer, PatientRepository patientRepository) {
        this.vectorStore = vectorStore;
        this.chatClient = chatClient;
        this.indexer = indexer;
        this.patientRepository = patientRepository;
    }

    public PatientHistoryAnswer query(UUID patientId, String question) {
        if (!patientRepository.existsById(patientId)) {
            throw new EntityNotFoundException("Paciente con ID " + patientId + " no encontrado");
        }

        if (!indexer.isPatientIndexed(patientId)) {
            indexer.indexPatient(patientId);
        }

        List<Document> retrieved = vectorStore.similaritySearch(
                SearchRequest.builder()
                        .query(question)
                        .topK(6)
                        .filterExpression("patientId == '" + patientId + "'")
                        .build());

        if (retrieved.isEmpty()) {
            return new PatientHistoryAnswer(
                    "No se encontraron expedientes clínicos relevantes para esta consulta.",
                    List.of());
        }

        String context = retrieved.stream()
                .map(doc -> "--- Expediente del " + doc.getMetadata().get("recordDate") + " ---\n" + doc.getText())
                .reduce("", (a, b) -> a.isEmpty() ? b : a + "\n\n" + b);

        String answer = chatClient.prompt()
                .system(SYSTEM_PROMPT)
                .user("""
                        Historial del paciente (expedientes clínicos):

                        %s

                        Pregunta: %s
                        """.formatted(context, question))
                .call()
                .content();

        List<HistorySource> sources = retrieved.stream()
                .map(doc -> new HistorySource(
                        UUID.fromString((String) doc.getMetadata().get("medicalRecordId")),
                        (String) doc.getMetadata().get("recordDate")))
                .toList();

        return new PatientHistoryAnswer(answer, sources);
    }
}
