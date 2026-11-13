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
import com.fepdev.sfm.backend.ai.history.dto.ReindexResponse;
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
        when(queryService.query(any(UUID.class), any(String.class), any(String.class))).thenReturn(answer);

        mockMvc.perform(post("/api/v1/ai/patients/{patientId}/query", patientId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"diagnosticos?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer").value("El paciente tiene hipertension"))
                .andExpect(jsonPath("$.sources").isArray());
    }

    @Test
    void queryStream_returnsSseAndDelegatesToService() throws Exception {
        UUID patientId = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/ai/patients/{patientId}/query/stream", patientId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"diagnosticos?\"}"))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                        .content().contentTypeCompatibleWith(MediaType.TEXT_EVENT_STREAM));

        org.mockito.Mockito.verify(queryService).streamQuery(
                org.mockito.ArgumentMatchers.eq(patientId),
                org.mockito.ArgumentMatchers.eq("diagnosticos?"),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void clearConversation_returns204() throws Exception {
        UUID patientId = UUID.randomUUID();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/v1/ai/patients/{patientId}/conversation", patientId))
                .andExpect(status().isNoContent());

        org.mockito.Mockito.verify(queryService)
                .clearConversation(org.mockito.ArgumentMatchers.eq(patientId),
                        org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void query_whenQuestionExceedsLimit_returns400() throws Exception {
        UUID patientId = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/ai/patients/{patientId}/query", patientId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"" + "x".repeat(501) + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void reindex_returns200WithIndexedCount() throws Exception {
        UUID patientId = UUID.randomUUID();
        when(queryService.reindex(patientId)).thenReturn(new ReindexResponse(patientId, 3));

        mockMvc.perform(post("/api/v1/ai/patients/{patientId}/reindex", patientId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.patientId").value(patientId.toString()))
                .andExpect(jsonPath("$.recordsIndexed").value(3));
    }
}
