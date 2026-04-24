package com.fepdev.sfm.backend.web.ai.history;

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

import com.fepdev.sfm.backend.ai.history.AiPatientHistoryController;
import com.fepdev.sfm.backend.ai.history.PatientHistoryQueryService;
import com.fepdev.sfm.backend.ai.history.dto.HistorySource;
import com.fepdev.sfm.backend.ai.history.dto.PatientHistoryAnswer;
import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;
import com.fepdev.sfm.backend.shared.exception.HandlerException;

@WebMvcTest(AiPatientHistoryController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(HandlerException.class)
class AiPatientHistoryControllerWebMvcTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean PatientHistoryQueryService queryService;

    @MockitoBean JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void query_returns200WithAnswer() throws Exception {
        UUID patientId = UUID.randomUUID();
        PatientHistoryAnswer answer = new PatientHistoryAnswer(
                "El paciente tiene hipertension", List.of(new HistorySource(UUID.randomUUID(), "2024-01-15")));
        when(queryService.query(any(UUID.class), any(String.class))).thenReturn(answer);

        mockMvc.perform(post("/api/v1/ai/patients/{patientId}/query", patientId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"diagnosticos?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer").value("El paciente tiene hipertension"))
                .andExpect(jsonPath("$.sources").isArray());
    }
}
