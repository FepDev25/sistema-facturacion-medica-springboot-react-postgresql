package com.fepdev.sfm.backend.web.ai.extraction;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fepdev.sfm.backend.ai.extraction.AiExtractionController;
import com.fepdev.sfm.backend.ai.extraction.RecordExtractionService;
import com.fepdev.sfm.backend.ai.extraction.dto.ExtractionResult;
import com.fepdev.sfm.backend.ai.extraction.dto.ExtractedDiagnosis;
import com.fepdev.sfm.backend.ai.extraction.dto.RecordExtractionRequest;
import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;
import com.fepdev.sfm.backend.shared.exception.HandlerException;

@WebMvcTest(AiExtractionController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(HandlerException.class)
class AiExtractionControllerWebMvcTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean RecordExtractionService extractionService;

    @MockitoBean JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void extract_returns200WithResult() throws Exception {
        ExtractionResult result = new ExtractionResult(
                List.of(new ExtractedDiagnosis("J02.9", "Faringitis", "mild")),
                List.of(), List.of());
        when(extractionService.extract(any(RecordExtractionRequest.class))).thenReturn(result);

        mockMvc.perform(post("/api/v1/ai/records/extract")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"appointmentId\":\"" + UUID.randomUUID()
                                + "\",\"medicalRecordId\":\"" + UUID.randomUUID()
                                + "\",\"clinicalNotes\":\"paciente con fiebre\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.diagnoses[0].icd10Code").value("J02.9"))
                .andExpect(jsonPath("$.diagnoses[0].description").value("Faringitis"));
    }
}
