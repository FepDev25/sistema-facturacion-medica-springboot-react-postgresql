package com.fepdev.sfm.backend.ai.suggestion;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fepdev.sfm.backend.ai.suggestion.dto.ItemSuggestionResult;
import com.fepdev.sfm.backend.ai.suggestion.dto.SuggestedItem;
import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalog;
import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalogRepository;
import com.fepdev.sfm.backend.domain.catalog.ServicesCatalog;
import com.fepdev.sfm.backend.domain.catalog.ServicesCatalogRepository;
import com.fepdev.sfm.backend.domain.invoice.Invoice;
import com.fepdev.sfm.backend.domain.invoice.InvoiceRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.Diagnosis;
import com.fepdev.sfm.backend.domain.medicalrecord.DiagnosisRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecord;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecordRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.Prescription;
import com.fepdev.sfm.backend.domain.medicalrecord.PrescriptionRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.Procedure;
import com.fepdev.sfm.backend.domain.medicalrecord.ProcedureRepository;

import jakarta.persistence.EntityNotFoundException;

@Service
public class ItemSuggestionService {

    private record LlmItem(String itemType, String name, String justification) {}
    private record LlmResult(List<LlmItem> suggestedItems) {}

    private static final String SYSTEM_PROMPT = """
            Eres un asistente de facturación médica. Tu tarea es sugerir los servicios y medicamentos
            a incluir en una factura, basándote en el contexto clínico de la cita.

            Reglas:
            - Usa EXACTAMENTE los nombres del catálogo provisto
            - Sugiere solo ítems clínicamente justificados por el contexto
            - No inventes servicios ni medicamentos que no estén en el catálogo
            - Máximo 8 ítems sugeridos
            - El campo itemType debe ser "service" o "medication"
            """;

    private final ChatClient chatClient;
    private final InvoiceRepository invoiceRepo;
    private final MedicalRecordRepository medicalRecordRepo;
    private final DiagnosisRepository diagnosisRepo;
    private final PrescriptionRepository prescriptionRepo;
    private final ProcedureRepository procedureRepo;
    private final ServicesCatalogRepository servicesRepo;
    private final MedicationsCatalogRepository medicationsRepo;

    public ItemSuggestionService(ChatClient chatClient,
                                  InvoiceRepository invoiceRepo,
                                  MedicalRecordRepository medicalRecordRepo,
                                  DiagnosisRepository diagnosisRepo,
                                  PrescriptionRepository prescriptionRepo,
                                  ProcedureRepository procedureRepo,
                                  ServicesCatalogRepository servicesRepo,
                                  MedicationsCatalogRepository medicationsRepo) {
        this.chatClient = chatClient;
        this.invoiceRepo = invoiceRepo;
        this.medicalRecordRepo = medicalRecordRepo;
        this.diagnosisRepo = diagnosisRepo;
        this.prescriptionRepo = prescriptionRepo;
        this.procedureRepo = procedureRepo;
        this.servicesRepo = servicesRepo;
        this.medicationsRepo = medicationsRepo;
    }

    @Transactional(readOnly = true)
    public ItemSuggestionResult suggestItems(UUID invoiceId) {
        Invoice invoice = invoiceRepo.findById(invoiceId)
                .orElseThrow(() -> new EntityNotFoundException("Factura no encontrada: " + invoiceId));

        UUID appointmentId = invoice.getAppointment().getId();

        MedicalRecord mr = medicalRecordRepo.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "No hay expediente médico para la cita: " + appointmentId));

        UUID mrId = mr.getId();
        List<Diagnosis> diagnoses = diagnosisRepo.findByMedicalRecordId(mrId);
        List<Prescription> prescriptions = prescriptionRepo.findAllByMedicalRecordId(mrId);
        List<Procedure> procedures = procedureRepo.findAllByMedicalRecordId(mrId);

        List<ServicesCatalog> services = servicesRepo.findAll().stream()
                .filter(ServicesCatalog::getIsActive).toList();
        List<MedicationsCatalog> medications = medicationsRepo.findAll().stream()
                .filter(MedicationsCatalog::isActive).toList();

        Map<String, UUID> serviceIdMap = services.stream()
                .collect(Collectors.toMap(ServicesCatalog::getName, ServicesCatalog::getId, (a, b) -> a));
        Map<String, BigDecimal> servicePriceMap = services.stream()
                .collect(Collectors.toMap(ServicesCatalog::getName, ServicesCatalog::getPrice, (a, b) -> a));
        Map<String, UUID> medicationIdMap = medications.stream()
                .collect(Collectors.toMap(MedicationsCatalog::getName, MedicationsCatalog::getId, (a, b) -> a));
        Map<String, BigDecimal> medicationPriceMap = medications.stream()
                .collect(Collectors.toMap(MedicationsCatalog::getName, MedicationsCatalog::getPrice, (a, b) -> a));

        String userPrompt = buildPrompt(diagnoses, prescriptions, procedures, services, medications);

        LlmResult llmResult = chatClient.prompt()
                .system(SYSTEM_PROMPT)
                .user(userPrompt)
                .call()
                .entity(LlmResult.class);

        if (llmResult == null || llmResult.suggestedItems() == null) {
            return new ItemSuggestionResult(List.of());
        }

        List<SuggestedItem> resolved = llmResult.suggestedItems().stream()
                .map(item -> resolve(item, serviceIdMap, servicePriceMap, medicationIdMap, medicationPriceMap))
                .toList();

        return new ItemSuggestionResult(resolved);
    }

    private SuggestedItem resolve(LlmItem item,
                                   Map<String, UUID> serviceIdMap, Map<String, BigDecimal> servicePriceMap,
                                   Map<String, UUID> medicationIdMap, Map<String, BigDecimal> medicationPriceMap) {
        boolean isService = "service".equalsIgnoreCase(item.itemType());
        Map<String, UUID> idMap = isService ? serviceIdMap : medicationIdMap;
        Map<String, BigDecimal> priceMap = isService ? servicePriceMap : medicationPriceMap;

        UUID matchedId = idMap.entrySet().stream()
                .filter(e -> e.getKey().equalsIgnoreCase(item.name().trim()))
                .findFirst().map(Map.Entry::getValue).orElse(null);

        BigDecimal price = priceMap.entrySet().stream()
                .filter(e -> e.getKey().equalsIgnoreCase(item.name().trim()))
                .findFirst().map(Map.Entry::getValue).orElse(null);

        return new SuggestedItem(item.itemType(), item.name(), matchedId, price, item.justification());
    }

    private String buildPrompt(List<Diagnosis> diagnoses, List<Prescription> prescriptions,
                                List<Procedure> procedures,
                                List<ServicesCatalog> services, List<MedicationsCatalog> medications) {
        StringBuilder sb = new StringBuilder();

        sb.append("## Contexto clínico de la cita\n\n");

        sb.append("**Diagnósticos:**\n");
        if (diagnoses.isEmpty()) {
            sb.append("- Sin diagnósticos registrados\n");
        } else {
            diagnoses.forEach(d -> sb.append("- ").append(d.getIcd10Code())
                    .append(": ").append(d.getDescription())
                    .append(" (").append(d.getSeverity()).append(")\n"));
        }

        sb.append("\n**Prescripciones:**\n");
        if (prescriptions.isEmpty()) {
            sb.append("- Sin prescripciones registradas\n");
        } else {
            prescriptions.forEach(p -> sb.append("- ").append(p.getMedication().getName())
                    .append(" ").append(p.getDosage())
                    .append(", ").append(p.getFrequency()).append("\n"));
        }

        sb.append("\n**Procedimientos realizados:**\n");
        if (procedures.isEmpty()) {
            sb.append("- Sin procedimientos registrados\n");
        } else {
            procedures.forEach(p -> sb.append("- ").append(p.getDescription()).append("\n"));
        }

        sb.append("\n## Catálogo de servicios disponibles\n");
        services.forEach(s -> sb.append("- ").append(s.getName())
                .append(" | $").append(s.getPrice()).append("\n"));

        sb.append("\n## Catálogo de medicamentos disponibles\n");
        medications.forEach(m -> sb.append("- ").append(m.getName())
                .append(" | $").append(m.getPrice()).append("\n"));

        sb.append("\nSugiere los ítems del catálogo que corresponden facturar para esta cita.");

        return sb.toString();
    }
}
