package com.fepdev.sfm.backend.web.insurance;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fepdev.sfm.backend.domain.insurance.InsuranceProviderController;
import com.fepdev.sfm.backend.domain.insurance.InsuranceService;
import com.fepdev.sfm.backend.domain.insurance.dto.InsuranceProviderResponse;
import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;
import com.fepdev.sfm.backend.shared.exception.HandlerException;

import jakarta.persistence.EntityNotFoundException;

@WebMvcTest(InsuranceProviderController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(HandlerException.class)
class InsuranceProviderControllerWebMvcTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    InsuranceService insuranceService;

    @MockitoBean
    JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void create_whenValidRequest_returns201() throws Exception {
        UUID id = UUID.randomUUID();
        InsuranceProviderResponse response = new InsuranceProviderResponse(id, "Seguro", "SEG1", "555", "s@x.com", null, true, null, null);
        when(insuranceService.createProvider(any())).thenReturn(response);

        String body = """
                {
                  "name": "Seguro",
                  "code": "SEG1",
                  "phone": "555",
                  "email": "s@x.com"
                }
                """;

        mockMvc.perform(post("/api/v1/insurance/providers").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(id.toString()));
    }

    @Test
    void create_whenInvalidRequest_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/insurance/providers").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void getById_whenNotFound_returns404() throws Exception {
        UUID id = UUID.randomUUID();
        when(insuranceService.getProviderById(id)).thenThrow(new EntityNotFoundException("No existe"));

        mockMvc.perform(get("/api/v1/insurance/providers/{id}", id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void create_whenBusinessRuleFails_returns422() throws Exception {
        when(insuranceService.createProvider(any())).thenThrow(new BusinessRuleException("Código duplicado"));

        String body = """
                {
                  "name": "Seguro",
                  "code": "SEG1",
                  "phone": "555",
                  "email": "s@x.com"
                }
                """;

        mockMvc.perform(post("/api/v1/insurance/providers").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.status").value(422));
    }
}
