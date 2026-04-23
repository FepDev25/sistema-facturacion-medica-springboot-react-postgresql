package com.fepdev.sfm.backend.ai.history;

import java.text.Normalizer;
import java.util.List;
import java.util.UUID;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import com.fepdev.sfm.backend.ai.history.dto.HistorySource;
import com.fepdev.sfm.backend.ai.history.dto.PatientHistoryAnswer;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecordRepository;
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
            - No incluyas códigos de procedimiento (CPT, ICD u otros) que no aparezcan explícitamente en los expedientes proporcionados
            - Responde de forma concisa y clínica
            - Puedes citar fechas de expedientes para contextualizar la respuesta
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

    private final VectorStore vectorStore;
    private final ChatClient chatClient;
    private final PatientHistoryIndexer indexer;
    private final PatientRepository patientRepository;
    private final MedicalRecordRepository medicalRecordRepository;

    public PatientHistoryQueryService(VectorStore vectorStore, ChatClient chatClient,
            PatientHistoryIndexer indexer, PatientRepository patientRepository,
            MedicalRecordRepository medicalRecordRepository) {
        this.vectorStore = vectorStore;
        this.chatClient = chatClient;
        this.indexer = indexer;
        this.patientRepository = patientRepository;
        this.medicalRecordRepository = medicalRecordRepository;
    }

    public PatientHistoryAnswer query(UUID patientId, String question) {
        if (!patientRepository.existsById(patientId)) {
            throw new EntityNotFoundException("Paciente con ID " + patientId + " no encontrado");
        }

        if (!indexer.isPatientIndexed(patientId)) {
            indexer.indexPatient(patientId);
        }

        return isSummaryQuery(question)
                ? queryWithStructuredContext(patientId, question)
                : queryWithVectorSearch(patientId, question);
    }

    // Ruta A: vector search con topK dinámico según tamaño del historial indexado.
    private PatientHistoryAnswer queryWithVectorSearch(UUID patientId, String question) {
        int topK = indexer.resolveTopK(patientId);

        List<Document> retrieved = vectorStore.similaritySearch(
                SearchRequest.builder()
                        .query(question)
                        .topK(topK)
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

    // Ruta B: bypass del vector search — contexto construido directamente desde BD.
    // Garantiza cobertura total del historial para queries de resumen o listado.
    private PatientHistoryAnswer queryWithStructuredContext(UUID patientId, String question) {
        String context = indexer.buildSummaryContext(patientId);

        if (context.isEmpty()) {
            return new PatientHistoryAnswer(
                    "No se encontraron expedientes clínicos relevantes para esta consulta.",
                    List.of());
        }

        String answer = chatClient.prompt()
                .system(SYSTEM_PROMPT)
                .user("""
                        Historial del paciente (resumen completo desde base de datos):

                        %s

                        Pregunta: %s
                        """.formatted(context, question))
                .call()
                .content();

        // Las fuentes son los expedientes más recientes del paciente
        List<HistorySource> sources = medicalRecordRepository
                .findByPatientId(patientId, org.springframework.data.domain.PageRequest.of(0, 6))
                .stream()
                .map(mr -> new HistorySource(mr.getId(), mr.getRecordDate().toLocalDate().toString()))
                .toList();

        return new PatientHistoryAnswer(answer, sources);
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
