package com.fepdev.sfm.backend.ai.extraction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fepdev.sfm.backend.ai.extraction.dto.ExtractionResult;
import com.fepdev.sfm.backend.ai.extraction.dto.RecordExtractionRequest;
import com.fepdev.sfm.backend.ai.guard.AiCallExecutor;
import com.fepdev.sfm.backend.ai.guard.AiUnavailableException;
import com.fepdev.sfm.backend.ai.support.AiTestFixtures;
import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalog;
import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalogRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.math.BigDecimal;
import java.util.List;
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
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RecordExtractionServiceTest {

    @Mock
    ChatClient chatClient;

    @Mock
    ChatClient.ChatClientRequestSpec requestSpec;

    @Mock
    ChatClient.CallResponseSpec callSpec;

    @Mock
    MedicationsCatalogRepository medicationsRepo;

    private RecordExtractionService service;
    private UUID amoxicilinaId;
    private UUID ibuprofenoId;

    @BeforeEach
    void setUp() {
        service = new RecordExtractionService(
                chatClient, new AiCallExecutor(new SimpleMeterRegistry(), 5, 0), medicationsRepo);

        amoxicilinaId = UUID.randomUUID();
        ibuprofenoId = UUID.randomUUID();
        when(medicationsRepo.findAll())
                .thenReturn(List.of(
                        medication("Amoxicilina 500 mg", amoxicilinaId, true),
                        medication("Ibuprofeno 400 mg", ibuprofenoId, true),
                        medication("Inactivo", UUID.randomUUID(), false)));

        lenient().when(chatClient.prompt()).thenReturn(requestSpec);
        lenient().when(requestSpec.system(anyString())).thenReturn(requestSpec);
        lenient().when(requestSpec.user(anyString())).thenReturn(requestSpec);
        lenient().when(requestSpec.tools(any(Object[].class))).thenReturn(requestSpec);
        lenient().when(requestSpec.call()).thenReturn(callSpec);
        lenient().when(callSpec.chatResponse()).thenReturn(AiTestFixtures.response("ok"));
    }

    @Test
    void extract_mapsDiagnosesPrescriptionsAndProcedures() {
        stubTools(tools -> {
            tools.addDiagnosis("J02.9", "Faringitis aguda", "mild");
            tools.addPrescription("amoxicilina 500 MG", "500 mg", "cada 8h", 7, "con alimentos");
            tools.addProcedure("87880", "Cultivo rapido", null);
        });

        ExtractionResult result = service.extract(request("Dolor de garganta", null, null));

        assertThat(result.diagnoses()).singleElement().satisfies(d -> {
            assertThat(d.icd10Code()).isEqualTo("J02.9");
            assertThat(d.severity()).isEqualTo("mild");
        });
        assertThat(result.prescriptions()).singleElement().satisfies(p -> {
            assertThat(p.medicationName()).isEqualTo("amoxicilina 500 MG");
            assertThat(p.matchedMedicationId()).isEqualTo(amoxicilinaId);
            assertThat(p.durationDays()).isEqualTo(7);
        });
        assertThat(result.procedures())
                .singleElement()
                .satisfies(p -> assertThat(p.procedureCode()).isEqualTo("87880"));
    }

    @Test
    void extract_unknownMedicationKeepsNullMatch() {
        stubTools(tools -> tools.addPrescription("Medicamento inventado", "1 g", "cada 12h", 3, null));

        ExtractionResult result = service.extract(request("Notas", "", ""));

        assertThat(result.prescriptions())
                .singleElement()
                .satisfies(p -> assertThat(p.matchedMedicationId()).isNull());
    }

    @Test
    void extract_withoutToolCallsReturnsEmptyCollections() {
        ExtractionResult result = service.extract(request("Notas", null, null));

        assertThat(result.diagnoses()).isEmpty();
        assertThat(result.prescriptions()).isEmpty();
        assertThat(result.procedures()).isEmpty();
    }

    @Test
    void extract_promptIncludesOnlyActiveCatalogAndEmptyFields() {
        ArgumentCaptor<String> systemCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> userCaptor = ArgumentCaptor.forClass(String.class);
        when(requestSpec.system(systemCaptor.capture())).thenReturn(requestSpec);
        when(requestSpec.user(userCaptor.capture())).thenReturn(requestSpec);

        service.extract(request("Notas clinicas", null, null));

        assertThat(systemCaptor.getValue())
                .contains("Amoxicilina 500 mg")
                .contains("Ibuprofeno 400 mg")
                .doesNotContain("Inactivo");
        assertThat(userCaptor.getValue())
                .contains("Notas clinicas")
                .contains("Motivo de consulta: ")
                .contains("Examen físico: ");
        verify(chatClient).prompt();
    }

    @Test
    void extract_propagatesProviderFailure() {
        when(callSpec.chatResponse()).thenThrow(new IllegalStateException("provider down"));

        assertThatThrownBy(() -> service.extract(request("Notas", null, null)))
                .isInstanceOf(AiUnavailableException.class)
                .hasMessageContaining("no esta disponible");
    }

    private void stubTools(java.util.function.Consumer<ExtractionTools> setup) {
        when(requestSpec.tools(any(Object[].class))).thenAnswer(invocation -> {
            Object argument = invocation.getArgument(0);
            ExtractionTools tools = argument instanceof ExtractionTools extractionTools
                    ? extractionTools
                    : (ExtractionTools) ((Object[]) argument)[0];
            setup.accept(tools);
            return requestSpec;
        });
    }

    private RecordExtractionRequest request(String notes, String exam, String complaint) {
        return new RecordExtractionRequest(UUID.randomUUID(), UUID.randomUUID(), notes, exam, complaint);
    }

    private MedicationsCatalog medication(String name, UUID id, boolean active) {
        MedicationsCatalog medication = new MedicationsCatalog();
        ReflectionTestUtils.setField(medication, "id", id);
        medication.setName(name);
        medication.setCode(name);
        medication.setPrice(BigDecimal.TEN);
        medication.setActive(active);
        return medication;
    }
}
