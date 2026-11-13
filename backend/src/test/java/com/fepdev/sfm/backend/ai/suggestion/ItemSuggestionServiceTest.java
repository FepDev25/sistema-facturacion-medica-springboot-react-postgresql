package com.fepdev.sfm.backend.ai.suggestion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fepdev.sfm.backend.ai.guard.AiCallExecutor;
import com.fepdev.sfm.backend.ai.guard.AiUnavailableException;
import com.fepdev.sfm.backend.ai.support.AiTestFixtures;
import com.fepdev.sfm.backend.domain.appointment.Appointment;
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
import com.fepdev.sfm.backend.domain.medicalrecord.PrescriptionRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.ProcedureRepository;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
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
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ItemSuggestionServiceTest {

    @Mock
    ChatClient chatClient;

    @Mock
    ChatClient.ChatClientRequestSpec requestSpec;

    @Mock
    ChatClient.CallResponseSpec callSpec;

    @Mock
    InvoiceRepository invoiceRepo;

    @Mock
    MedicalRecordRepository medicalRecordRepo;

    @Mock
    DiagnosisRepository diagnosisRepo;

    @Mock
    PrescriptionRepository prescriptionRepo;

    @Mock
    ProcedureRepository procedureRepo;

    @Mock
    ServicesCatalogRepository servicesRepo;

    @Mock
    MedicationsCatalogRepository medicationsRepo;

    private ItemSuggestionService service;
    private UUID invoiceId;
    private UUID appointmentId;
    private UUID medicalRecordId;

    @BeforeEach
    void setUp() {
        service = new ItemSuggestionService(
                chatClient,
                new AiCallExecutor(new SimpleMeterRegistry(), 5, 0),
                invoiceRepo,
                medicalRecordRepo,
                diagnosisRepo,
                prescriptionRepo,
                procedureRepo,
                servicesRepo,
                medicationsRepo);

        invoiceId = UUID.randomUUID();
        appointmentId = UUID.randomUUID();
        medicalRecordId = UUID.randomUUID();

        lenient().when(chatClient.prompt()).thenReturn(requestSpec);
        lenient().when(requestSpec.system(anyString())).thenReturn(requestSpec);
        lenient().when(requestSpec.user(anyString())).thenReturn(requestSpec);
        lenient().when(requestSpec.call()).thenReturn(callSpec);
    }

    @Test
    void suggestItems_whenInvoiceNotFound_throwsEntityNotFoundException() {
        when(invoiceRepo.findById(invoiceId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.suggestItems(invoiceId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("Factura no encontrada");
    }

    @Test
    void suggestItems_whenInvoiceHasNoAppointment_throwsBusinessRuleException() {
        Invoice invoice = new Invoice();
        invoice.setAppointment(null);
        when(invoiceRepo.findById(invoiceId)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> service.suggestItems(invoiceId))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("no tiene una cita asociada");
    }

    @Test
    void suggestItems_whenMedicalRecordMissing_throwsEntityNotFoundException() {
        stubInvoice();
        when(medicalRecordRepo.findByAppointmentId(appointmentId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.suggestItems(invoiceId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("No hay expediente");
    }

    @Test
    void suggestItems_resolvesCatalogMatchesCaseInsensitively() {
        stubClinicalContext();
        UUID serviceId = UUID.randomUUID();
        UUID medicationId = UUID.randomUUID();
        ServicesCatalog consulta = service("Consulta de seguimiento", serviceId, new BigDecimal("500.00"), true);
        ServicesCatalog inactivo = service("Servicio inactivo", UUID.randomUUID(), BigDecimal.TEN, false);
        MedicationsCatalog losartan = medication("Losartan 50 mg", medicationId, new BigDecimal("120.00"), true);
        when(servicesRepo.findAll()).thenReturn(List.of(consulta, inactivo));
        when(medicationsRepo.findAll()).thenReturn(List.of(losartan));

        ItemSuggestionService.LlmResult llm = new ItemSuggestionService.LlmResult(List.of(
                new ItemSuggestionService.LlmItem("service", "consulta de SEGUIMIENTO", "control"),
                new ItemSuggestionService.LlmItem("medication", "Losartan 50 mg", "HTA"),
                new ItemSuggestionService.LlmItem("service", "No existe", "x")));
        stubEntity(llm);

        var result = service.suggestItems(invoiceId);

        assertThat(result.suggestedItems()).hasSize(3);
        assertThat(result.suggestedItems().get(0).matchedCatalogId()).isEqualTo(serviceId);
        assertThat(result.suggestedItems().get(0).unitPrice()).isEqualByComparingTo("500.00");
        assertThat(result.suggestedItems().get(1).matchedCatalogId()).isEqualTo(medicationId);
        assertThat(result.suggestedItems().get(2).matchedCatalogId()).isNull();
        assertThat(result.suggestedItems().get(2).unitPrice()).isNull();
    }

    @Test
    void suggestItems_promptContainsClinicalContextAndCatalogs() {
        stubClinicalContext();
        Diagnosis diagnosis = mock(Diagnosis.class);
        when(diagnosis.getIcd10Code()).thenReturn("I10");
        when(diagnosis.getDescription()).thenReturn("Hipertension esencial");
        when(diagnosis.getSeverity()).thenReturn(null);
        when(diagnosisRepo.findByMedicalRecordId(medicalRecordId)).thenReturn(List.of(diagnosis));
        when(prescriptionRepo.findAllByMedicalRecordId(medicalRecordId)).thenReturn(List.of());
        when(procedureRepo.findAllByMedicalRecordId(medicalRecordId)).thenReturn(List.of());
        when(servicesRepo.findAll()).thenReturn(List.of(service("Consulta", UUID.randomUUID(), BigDecimal.TEN, true)));
        when(medicationsRepo.findAll()).thenReturn(List.of());
        stubEntity(new ItemSuggestionService.LlmResult(List.of()));

        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        when(requestSpec.user(promptCaptor.capture())).thenReturn(requestSpec);

        service.suggestItems(invoiceId);

        assertThat(promptCaptor.getValue())
                .contains("I10: Hipertension esencial")
                .contains("Sin prescripciones registradas")
                .contains("Sin procedimientos registrados")
                .contains("Consulta | $10")
                .contains("Catálogo de medicamentos");
    }

    @Test
    void suggestItems_nullLlmResult_returnsEmpty() {
        stubClinicalContext();
        when(servicesRepo.findAll()).thenReturn(List.of());
        when(medicationsRepo.findAll()).thenReturn(List.of());
        when(callSpec.responseEntity(ItemSuggestionService.LlmResult.class)).thenReturn(null);

        var result = service.suggestItems(invoiceId);

        assertThat(result.suggestedItems()).isEmpty();
    }

    @Test
    void suggestItems_llmResultWithoutItems_returnsEmpty() {
        stubClinicalContext();
        when(servicesRepo.findAll()).thenReturn(List.of());
        when(medicationsRepo.findAll()).thenReturn(List.of());
        stubEntity(new ItemSuggestionService.LlmResult(null));

        assertThat(service.suggestItems(invoiceId).suggestedItems()).isEmpty();
    }

    @Test
    void suggestItems_propagatesProviderFailure() {
        stubClinicalContext();
        when(servicesRepo.findAll()).thenReturn(List.of());
        when(medicationsRepo.findAll()).thenReturn(List.of());
        when(callSpec.responseEntity(ItemSuggestionService.LlmResult.class))
                .thenThrow(new IllegalStateException("provider down"));

        assertThatThrownBy(() -> service.suggestItems(invoiceId))
                .isInstanceOf(AiUnavailableException.class)
                .hasMessageContaining("no esta disponible");
    }

    @Test
    void suggestItems_queriesInactiveCatalogsButFiltersThem() {
        stubClinicalContext();
        when(servicesRepo.findAll()).thenReturn(List.of(service("Inactivo", UUID.randomUUID(), BigDecimal.ONE, false)));
        when(medicationsRepo.findAll()).thenReturn(List.of());
        stubEntity(new ItemSuggestionService.LlmResult(
                List.of(new ItemSuggestionService.LlmItem("service", "Inactivo", "x"))));

        var result = service.suggestItems(invoiceId);

        assertThat(result.suggestedItems())
                .singleElement()
                .satisfies(item -> assertThat(item.matchedCatalogId()).isNull());
        verify(servicesRepo).findAll();
    }

    private void stubInvoice() {
        Invoice invoice = new Invoice();
        Appointment appointment = mock(Appointment.class);
        when(appointment.getId()).thenReturn(appointmentId);
        invoice.setAppointment(appointment);
        when(invoiceRepo.findById(invoiceId)).thenReturn(Optional.of(invoice));
    }

    private void stubClinicalContext() {
        stubInvoice();
        MedicalRecord record = mock(MedicalRecord.class);
        when(record.getId()).thenReturn(medicalRecordId);
        when(medicalRecordRepo.findByAppointmentId(appointmentId)).thenReturn(Optional.of(record));
        when(diagnosisRepo.findByMedicalRecordId(medicalRecordId)).thenReturn(List.of());
        when(prescriptionRepo.findAllByMedicalRecordId(medicalRecordId)).thenReturn(List.of());
        when(procedureRepo.findAllByMedicalRecordId(medicalRecordId)).thenReturn(List.of());
    }

    private void stubEntity(ItemSuggestionService.LlmResult llm) {
        ChatResponse response = AiTestFixtures.response("{}", 100, 20);
        when(callSpec.responseEntity(ItemSuggestionService.LlmResult.class))
                .thenReturn(new ResponseEntity<>(response, llm));
    }

    private ServicesCatalog service(String name, UUID id, BigDecimal price, boolean active) {
        ServicesCatalog service = new ServicesCatalog();
        ReflectionTestUtils.setField(service, "id", id);
        service.setName(name);
        service.setCode(name);
        service.setPrice(price);
        service.setIsActive(active);
        return service;
    }

    private MedicationsCatalog medication(String name, UUID id, BigDecimal price, boolean active) {
        MedicationsCatalog medication = new MedicationsCatalog();
        ReflectionTestUtils.setField(medication, "id", id);
        medication.setName(name);
        medication.setCode(name);
        medication.setPrice(price);
        medication.setActive(active);
        return medication;
    }
}
