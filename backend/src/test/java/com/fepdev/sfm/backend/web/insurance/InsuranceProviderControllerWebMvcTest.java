package com.fepdev.sfm.backend.web.insurance;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
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

    @Test
    void update_deactivate_and_list_whenSuccess_coverEndpoints() throws Exception {
        UUID id = UUID.randomUUID();
        InsuranceProviderResponse updated = new InsuranceProviderResponse(id, "Seguro 2", "SEG2", "999", "u@x.com", null, false,
                null, null);
        when(insuranceService.updateProvider(any(), any())).thenReturn(updated);
        when(insuranceService.listProviders(any(), any())).thenReturn(new PageImpl<>(List.of(updated)));

        mockMvc.perform(put("/api/v1/insurance/providers/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Seguro 2","phone":"999","isActive":false}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()));

        mockMvc.perform(delete("/api/v1/insurance/providers/{id}", id))
                .andExpect(status().isNoContent());
        verify(insuranceService).deactivateProvider(id);

        mockMvc.perform(get("/api/v1/insurance/providers").param("active", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].code").value("SEG2"));
    }
}
