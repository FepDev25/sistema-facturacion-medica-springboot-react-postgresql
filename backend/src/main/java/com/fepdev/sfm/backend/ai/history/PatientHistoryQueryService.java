package com.fepdev.sfm.backend.ai.history;

import java.text.Normalizer;
import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.fepdev.sfm.backend.ai.guard.AiCallExecutor;
import com.fepdev.sfm.backend.ai.history.PatientConversationMemory.ConversationTurn;
import com.fepdev.sfm.backend.ai.history.dto.HistorySource;
import com.fepdev.sfm.backend.ai.history.dto.PatientHistoryAnswer;
import com.fepdev.sfm.backend.ai.history.dto.ReindexResponse;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecordRepository;
import com.fepdev.sfm.backend.domain.patient.PatientRepository;

import jakarta.persistence.EntityNotFoundException;
import reactor.core.Disposable;
import reactor.core.Disposables;

@Service
public class PatientHistoryQueryService {

    private static final String SYSTEM_PROMPT = """
            Eres un asistente médico clínico. Se te proporciona el historial clínico de un paciente.
            Responde la pregunta del médico o personal clínico basándote únicamente en los expedientes proporcionados.

            Reglas:
            - Basa tu respuesta SOLO en los expedientes clínicos proporcionados
            - Si la información no está en el historial, indícalo claramente
            - No inventes diagnósticos, medicamentos ni procedimientos que no estén en el contexto
            - No incluyas códigos de procedimiento (CPT, ICD u otros) que no aparezcan explícitamente en los expedientes proporcionados
            - Responde de forma concisa y clínica
            - Puedes citar fechas de expedientes para contextualizar la respuesta
            - Si hay conversación previa, úsala para resolver referencias como "eso", "desde cuándo" o "la dosis"
            """;

    // Patrones que indican intent de resumen/listado completo del historial.
    // Cuando alguno de estos aparece en la query (normalizada, sin acentos, minúsculas),
    // se bypasea el vector search y se construye el contexto desde BD completa.
    //
    // Cubiertos: resumen explícito | listado plural de entidades | antecedentes amplios |
    //            condiciones crónicas/conocidas | cuáles son + entidad | todos/as los/las + entidad
    private static final List<String> SUMMARY_PATTERNS = List.of(
        // Resumen y perfil explícito
        "historial completo", "historial medico", "historia clinica",
        "resumen del historial", "resumen medico", "resumen clinico",
        "perfil medico", "perfil de salud", "panorama clinico",
        // "Todos/todas" + entidad clínica
        "todos los diagnosticos", "todas las condiciones", "todos los medicamentos",
        "todos los procedimientos", "todos los estudios", "todos los antecedentes",
        "todas las enfermedades", "todos los padecimientos", "todos los tratamientos",
        // "Qué" + entidad en plural (sin condición específica)
        "que diagnosticos", "que condiciones", "que enfermedades", "que padecimientos",
        "que medicamentos", "que procedimientos", "que estudios", "que tratamientos",
        "que antecedentes",
        // "Cuáles son" + entidad
        "cuales son sus diagnosticos", "cuales son sus condiciones",
        "cuales son sus enfermedades", "cuales son sus medicamentos",
        "cuales son sus padecimientos", "cuales son sus antecedentes",
        "cuales son sus procedimientos", "cuales son sus estudios",
        "cuales son los diagnosticos", "cuales son las condiciones",
        "cuales son las enfermedades", "cuales son los medicamentos",
        "cuales son los procedimientos", "cuales son los estudios",
        // Antecedentes amplios (sin enfermedad específica pospuesta)
        "antecedentes medicos", "antecedentes patologicos",
        "antecedentes personales patologicos", "antecedentes personales",
        "antecedentes de salud", "antecedentes heredofamiliares",
        "antecedentes clinicos",
        // Condiciones crónicas / conocidas / activas
        "condiciones cronicas", "enfermedades cronicas", "padecimientos cronicos",
        "condiciones conocidas", "condiciones activas", "condiciones registradas",
        "enfermedades conocidas", "enfermedades registradas",
        "diagnosticos conocidos", "diagnosticos registrados",
        // Lista / listado explícito
        "lista de diagnosticos", "lista de medicamentos", "lista de procedimientos",
        "lista de condiciones", "lista de enfermedades",
        "listado de diagnosticos", "listado de medicamentos", "listado de procedimientos",
        // Frases naturales de resumen
        "enfermedades que padece", "que padece el paciente", "que enfermedades tiene",
        "que enfermedades ha tenido", "que condicion cronica", "condicion cronica conocida",
        "tiene el paciente alguna condicion", "tiene alguna enfermedad cronica",
        "medicamentos que toma", "medicamentos que ha tomado"
    );

    private static final int MAX_TURN_CHARS = 1_200;

    private final VectorStore vectorStore;
    private final ChatClient chatClient;
    private final AiCallExecutor aiCallExecutor;
    private final PatientHistoryIndexer indexer;
    private final PatientRepository patientRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final PatientConversationMemory conversationMemory;

    public PatientHistoryQueryService(VectorStore vectorStore, ChatClient chatClient,
            AiCallExecutor aiCallExecutor, PatientHistoryIndexer indexer,
            PatientRepository patientRepository,
            MedicalRecordRepository medicalRecordRepository,
            PatientConversationMemory conversationMemory) {
        this.vectorStore = vectorStore;
        this.chatClient = chatClient;
        this.aiCallExecutor = aiCallExecutor;
        this.indexer = indexer;
        this.patientRepository = patientRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.conversationMemory = conversationMemory;
    }

    public PatientHistoryAnswer query(UUID patientId, String question) {
        return query(patientId, question, currentUserId());
    }

    public PatientHistoryAnswer query(UUID patientId, String question, String userId) {
        StreamPlan plan = prepare(patientId, question, userId);
        if (plan.immediate() != null) {
            return plan.immediate();
        }

        ChatResponse response = aiCallExecutor.callChat(plan.feature(), () -> chatClient.prompt()
                .system(SYSTEM_PROMPT)
                .user(plan.userPrompt())
                .call()
                .chatResponse());

        String answer = contentOf(response);
        if (!answer.isBlank()) {
            conversationMemory.append(userId, patientId, question, answer);
        }
        return new PatientHistoryAnswer(answer, plan.sources());
    }

    // Version SSE: emite cada delta y, al completar, guarda el turno en memoria.
    // Los errores del proveedor se entregan por onError para que el controlador
    // cierre el SseEmitter con un evento "error".
    public Disposable streamQuery(UUID patientId, String question, String userId,
            Consumer<String> onToken, Consumer<PatientHistoryAnswer> onComplete,
            Consumer<Throwable> onError) {
        StreamPlan plan = prepare(patientId, question, userId);
        if (plan.immediate() != null) {
            onComplete.accept(plan.immediate());
            return Disposables.disposed();
        }

        StringBuilder answer = new StringBuilder();
        return aiCallExecutor.stream(plan.feature(), () -> chatClient.prompt()
                        .system(SYSTEM_PROMPT)
                        .user(plan.userPrompt())
                        .stream()
                        .chatResponse())
                .map(PatientHistoryQueryService::contentOf)
                .filter(text -> text != null && !text.isEmpty())
                .subscribe(
                        token -> {
                            answer.append(token);
                            onToken.accept(token);
                        },
                        onError,
                        () -> {
                            if (!answer.isEmpty()) {
                                conversationMemory.append(userId, patientId, question, answer.toString());
                            }
                            onComplete.accept(new PatientHistoryAnswer(answer.toString(), plan.sources()));
                        });
    }

    public void clearConversation(UUID patientId, String userId) {
        requirePatient(patientId);
        conversationMemory.clear(userId, patientId);
    }

    // Reparación manual del índice de un paciente (ADMIN). Reindexa todos sus expedientes
    // y elimina documentos huérfanos.
    public ReindexResponse reindex(UUID patientId) {
        requirePatient(patientId);
        int indexed = indexer.indexPatient(patientId);
        return new ReindexResponse(patientId, indexed);
    }

    private record StreamPlan(String feature, String userPrompt,
            List<HistorySource> sources, PatientHistoryAnswer immediate) {}

    private StreamPlan prepare(UUID patientId, String question, String userId) {
        requirePatient(patientId);

        if (!indexer.isPatientFullyIndexed(patientId)) {
            indexer.indexPatient(patientId);
        }

        List<ConversationTurn> turns = conversationMemory.recent(userId, patientId);
        boolean summary = isSummaryQuery(question);
        String feature = summary ? "history-summary" : "history-vector";

        String context;
        List<HistorySource> sources;
        if (summary) {
            context = indexer.buildSummaryContext(patientId);
            if (context.isEmpty()) {
                return new StreamPlan(feature, "", List.of(), noRecordsAnswer());
            }
            sources = medicalRecordRepository
                    .findByPatientId(patientId, org.springframework.data.domain.PageRequest.of(0, 6))
                    .stream()
                    .map(mr -> new HistorySource(mr.getId(), mr.getRecordDate().toLocalDate().toString()))
                    .toList();
        } else {
            List<Document> retrieved = vectorStore.similaritySearch(
                    SearchRequest.builder()
                            .query(retrievalQuery(question, turns))
                            .topK(indexer.resolveTopK(patientId))
                            .filterExpression("patientId == '" + patientId + "'")
                            .build());

            if (retrieved.isEmpty()) {
                return new StreamPlan(feature, "", List.of(), noRecordsAnswer());
            }

            context = retrieved.stream()
                    .map(doc -> "--- Expediente del " + doc.getMetadata().get("recordDate") + " ---\n" + doc.getText())
                    .reduce("", (a, b) -> a.isEmpty() ? b : a + "\n\n" + b);
            sources = retrieved.stream()
                    .map(doc -> new HistorySource(
                            UUID.fromString((String) doc.getMetadata().get("medicalRecordId")),
                            (String) doc.getMetadata().get("recordDate")))
                    .toList();
        }

        return new StreamPlan(feature, buildUserPrompt(context, question, turns), sources, null);
    }

    private PatientHistoryAnswer noRecordsAnswer() {
        return new PatientHistoryAnswer(
                "No se encontraron expedientes clínicos relevantes para esta consulta.",
                List.of());
    }

    private void requirePatient(UUID patientId) {
        if (!patientRepository.existsById(patientId)) {
            throw new EntityNotFoundException("Paciente con ID " + patientId + " no encontrado");
        }
    }

    private String buildUserPrompt(String context, String question, List<ConversationTurn> turns) {
        String preamble = buildConversationPreamble(turns);
        return """
                %sHistorial del paciente (expedientes clínicos):

                %s

                Pregunta: %s
                """.formatted(preamble, context, question);
    }

    private String buildConversationPreamble(List<ConversationTurn> turns) {
        if (turns.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder(
                "Conversación previa con el mismo usuario (solo para resolver seguimientos):\n");
        for (ConversationTurn turn : turns) {
            sb.append("- Pregunta: ").append(turn.question()).append('\n');
            sb.append("  Respuesta: ").append(truncate(turn.answer())).append('\n');
        }
        sb.append('\n');
        return sb.toString();
    }

    // Para preguntas de seguimiento ("¿y desde cuándo?") el vector search necesita el
    // tema anterior; de lo contrario la consulta carece de contexto semántico.
    private String retrievalQuery(String question, List<ConversationTurn> turns) {
        if (turns.isEmpty()) {
            return question;
        }
        return turns.get(turns.size() - 1).question() + " " + question;
    }

    private static String truncate(String value) {
        if (value == null || value.length() <= MAX_TURN_CHARS) {
            return value;
        }
        return value.substring(0, MAX_TURN_CHARS) + "…";
    }

    private static String contentOf(ChatResponse response) {
        if (response == null || response.getResult() == null || response.getResult().getOutput() == null) {
            return "";
        }
        String text = response.getResult().getOutput().getText();
        return text != null ? text : "";
    }

    private static String currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() ? auth.getName() : "anonymous";
    }

    // Normaliza la query (sin acentos, minúsculas) y verifica si contiene algún patrón de resumen.
    // La normalización unicode elimina la dependencia de que el usuario escriba con o sin tildes.
    private boolean isSummaryQuery(String question) {
        String normalized = Normalizer
                .normalize(question.toLowerCase(), Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}", "");
        return SUMMARY_PATTERNS.stream().anyMatch(normalized::contains);
    }
}
