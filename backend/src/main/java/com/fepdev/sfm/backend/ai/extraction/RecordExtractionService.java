package com.fepdev.sfm.backend.ai.extraction;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import com.fepdev.sfm.backend.ai.extraction.dto.ExtractedPrescription;
import com.fepdev.sfm.backend.ai.extraction.dto.ExtractionResult;
import com.fepdev.sfm.backend.ai.extraction.dto.RecordExtractionRequest;
import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalogRepository;

@Service
public class RecordExtractionService {

    private final ChatClient chatClient;
    private final MedicationsCatalogRepository medicationsRepo;

    public RecordExtractionService(ChatClient chatClient, MedicationsCatalogRepository medicationsRepo) {
        this.chatClient = chatClient;
        this.medicationsRepo = medicationsRepo;
    }

    public ExtractionResult extract(RecordExtractionRequest request) {
        Map<String, UUID> medicationMap = loadMedicationMap();
        String catalogText = formatCatalog(medicationMap.keySet());

        String systemPrompt = """
                Eres un asistente médico especializado en extracción de información clínica estructurada.
                Analiza las notas clínicas de la cita y usa las herramientas disponibles para registrar las entidades clínicas encontradas.

                Catálogo de medicamentos disponibles (usa EXACTAMENTE estos nombres al registrar prescripciones):
                %s

                Reglas:
                - Extrae SOLO información que esté explícitamente mencionada en las notas
                - El nombre del medicamento debe coincidir exactamente con alguno del catálogo anterior
                - La severidad de diagnósticos debe ser uno de: mild, moderate, severe, critical
                - Si no encuentras entidades de un tipo, no llames esa herramienta
                - Llama cada herramienta una vez por entidad encontrada
                """.formatted(catalogText);

        String userPrompt = """
                Motivo de consulta: %s
                Notas clínicas: %s
                Examen físico: %s
                """.formatted(
                nvl(request.chiefComplaint()),
                nvl(request.clinicalNotes()),
                nvl(request.physicalExam())
        );

        var tools = new ExtractionTools();
        chatClient.prompt()
                .system(systemPrompt)
                .user(userPrompt)
                .tools(tools)
                .call()
                .content();

        List<ExtractedPrescription> prescriptions = tools.getRawPrescriptions().stream()
                .map(rp -> new ExtractedPrescription(
                        rp.medicationName(),
                        resolveId(rp.medicationName(), medicationMap),
                        rp.dosage(),
                        rp.frequency(),
                        rp.durationDays(),
                        rp.instructions()
                ))
                .toList();

        return new ExtractionResult(tools.getDiagnoses(), prescriptions, tools.getProcedures());
    }

    private Map<String, UUID> loadMedicationMap() {
        return medicationsRepo.findAll().stream()
                .filter(m -> m.isActive())
                .collect(Collectors.toMap(
                        m -> m.getName(),
                        m -> m.getId(),
                        (a, b) -> a
                ));
    }

    private String formatCatalog(Set<String> names) {
        return names.stream()
                .sorted()
                .map(n -> "- " + n)
                .collect(Collectors.joining("\n"));
    }

    private UUID resolveId(String name, Map<String, UUID> map) {
        if (name == null) return null;
        return map.entrySet().stream()
                .filter(e -> e.getKey().equalsIgnoreCase(name.trim()))
                .findFirst()
                .map(Map.Entry::getValue)
                .orElse(null);
    }

    private static String nvl(String s) {
        return s != null ? s : "";
    }
}
