package com.fepdev.sfm.backend.web.ai.icd10;

import java.util.List;

import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.anyString;
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

import com.fepdev.sfm.backend.ai.icd10.AiIcd10Controller;
import com.fepdev.sfm.backend.ai.icd10.Icd10SuggestionService;
import com.fepdev.sfm.backend.ai.icd10.dto.Icd10Suggestion;
import com.fepdev.sfm.backend.ai.icd10.dto.Icd10SuggestionResult;
import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;
import com.fepdev.sfm.backend.shared.exception.HandlerException;

@WebMvcTest(AiIcd10Controller.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(HandlerException.class)
class AiIcd10ControllerWebMvcTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean Icd10SuggestionService suggestionService;

    @MockitoBean JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void suggest_returns200WithSuggestions() throws Exception {
        Icd10SuggestionResult result = new Icd10SuggestionResult(List.of(
                new Icd10Suggestion("I10", "Hipertension esencial", 0.95)));
        when(suggestionService.suggest(anyString())).thenReturn(result);

        mockMvc.perform(post("/api/v1/ai/icd10/suggest")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"query\":\"presion alta\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.suggestions[0].code").value("I10"))
                .andExpect(jsonPath("$.suggestions[0].description").value("Hipertension esencial"));
    }
}
