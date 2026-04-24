package com.fepdev.sfm.backend.web.ai.suggestion;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fepdev.sfm.backend.ai.suggestion.AiItemSuggestionController;
import com.fepdev.sfm.backend.ai.suggestion.ItemSuggestionService;
import com.fepdev.sfm.backend.ai.suggestion.dto.ItemSuggestionResult;
import com.fepdev.sfm.backend.ai.suggestion.dto.SuggestedItem;
import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;
import com.fepdev.sfm.backend.shared.exception.HandlerException;

@WebMvcTest(AiItemSuggestionController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(HandlerException.class)
class AiItemSuggestionControllerWebMvcTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean ItemSuggestionService suggestionService;

    @MockitoBean JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void suggestItems_returns200WithSuggestions() throws Exception {
        UUID invoiceId = UUID.randomUUID();
        ItemSuggestionResult result = new ItemSuggestionResult(List.of(
                new SuggestedItem("service", "Consulta general", UUID.randomUUID(),
                        BigDecimal.valueOf(50000), "Diagnostico de rutina")));
        when(suggestionService.suggestItems(any(UUID.class))).thenReturn(result);

        mockMvc.perform(post("/api/v1/ai/invoices/{id}/suggest-items", invoiceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.suggestedItems[0].itemType").value("service"))
                .andExpect(jsonPath("$.suggestedItems[0].name").value("Consulta general"));
    }
}
