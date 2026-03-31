package com.fepdev.sfm.backend.web.insurance;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fepdev.sfm.backend.domain.insurance.InsurancePolicyController;
import com.fepdev.sfm.backend.domain.insurance.InsuranceService;
import com.fepdev.sfm.backend.domain.insurance.dto.InsurancePolicyResponse;
import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;
import com.fepdev.sfm.backend.shared.exception.HandlerException;

import jakarta.persistence.EntityNotFoundException;

@WebMvcTest(InsurancePolicyController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(HandlerException.class)
class InsurancePolicyControllerWebMvcTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    InsuranceService insuranceService;

    @MockitoBean
    JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void create_whenValidRequest_returns201() throws Exception {
        UUID id = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();
        UUID providerId = UUID.randomUUID();
        InsurancePolicyResponse response = new InsurancePolicyResponse(
                id, patientId, "Ana", "Lopez", providerId, "Seguro", "POL-1",
                new BigDecimal("80.00"), BigDecimal.ZERO, LocalDate.now(), LocalDate.now().plusYears(1), true, null, null);
        when(insuranceService.createPolicy(any())).thenReturn(response);

        String body = """
                {
                  "patientId": "%s",
                  "providerId": "%s",
                  "policyNumber": "POL-1",
                  "coveragePercentage": 80.0,
                  "deductible": 0,
                  "startDate": "%s",
                  "endDate": "%s"
                }
                """.formatted(patientId, providerId, LocalDate.now(), LocalDate.now().plusYears(1));

        mockMvc.perform(post("/api/v1/insurance/policies").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(id.toString()));
    }

    @Test
    void create_whenInvalidRequest_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/insurance/policies").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void getById_whenNotFound_returns404() throws Exception {
        UUID id = UUID.randomUUID();
        when(insuranceService.getPolicyById(id)).thenThrow(new EntityNotFoundException("No existe"));

        mockMvc.perform(get("/api/v1/insurance/policies/{id}", id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void create_whenBusinessRuleFails_returns422() throws Exception {
        when(insuranceService.createPolicy(any())).thenThrow(new BusinessRuleException("Rango inválido"));

        String body = """
                {
                  "patientId": "%s",
                  "providerId": "%s",
                  "policyNumber": "POL-1",
                  "coveragePercentage": 80.0,
                  "deductible": 0,
                  "startDate": "%s",
                  "endDate": "%s"
                }
                """.formatted(UUID.randomUUID(), UUID.randomUUID(), LocalDate.now(), LocalDate.now().plusYears(1));

        mockMvc.perform(post("/api/v1/insurance/policies").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.status").value(422));
    }
}
