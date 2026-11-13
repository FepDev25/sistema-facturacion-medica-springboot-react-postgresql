package com.fepdev.sfm.backend.web.ai.lab;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fepdev.sfm.backend.ai.lab.AiLabController;
import com.fepdev.sfm.backend.ai.lab.AiLabResponse;
import com.fepdev.sfm.backend.ai.lab.AiLabService;
import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;
import com.fepdev.sfm.backend.shared.exception.HandlerException;

@WebMvcTest(AiLabController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(HandlerException.class)
class AiLabControllerWebMvcTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean AiLabService labService;
    @MockitoBean JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void snapshot_returnsConfigurationAndUsage() throws Exception {
        AiLabResponse response = new AiLabResponse(
                "claude-haiku-4-5-20251001", "v-test", true, 20, 1800, 6,
                List.of(new AiLabResponse.FeatureInfo("icd10-normalize", "Normalizacion",
                        "POST /api/v1/ai/icd10/suggest", "v1", "desc")),
                List.of(new AiLabResponse.ModelPricing("claude-haiku-4-5-20251001", 1.0, 5.0)),
                List.of(new AiLabResponse.FeatureUsage("icd10-normalize", 2, 0, 100, 20, 0.001, 150)),
                new AiLabResponse.EvalsInfo("manual", 1,
                        Map.of("icd10", Map.of("minTop1", 0.6))));
        when(labService.snapshot()).thenReturn(response);

        mockMvc.perform(get("/api/v1/ai/lab"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.model").value("claude-haiku-4-5-20251001"))
                .andExpect(jsonPath("$.distributedRateLimit").value(true))
                .andExpect(jsonPath("$.features[0].id").value("icd10-normalize"))
                .andExpect(jsonPath("$.usage[0].promptTokens").value(100))
                .andExpect(jsonPath("$.evals.mode").value("manual"));
    }
}
