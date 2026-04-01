package com.fepdev.sfm.backend.web.catalog;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalogController;
import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalogService;
import com.fepdev.sfm.backend.domain.catalog.Unit;
import com.fepdev.sfm.backend.domain.catalog.dto.MedicationResponse;
import com.fepdev.sfm.backend.domain.catalog.dto.MedicationSummaryResponse;
import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;
import com.fepdev.sfm.backend.shared.exception.HandlerException;

import jakarta.persistence.EntityNotFoundException;

@WebMvcTest(MedicationsCatalogController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(HandlerException.class)
class MedicationsCatalogControllerWebMvcTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    MedicationsCatalogService medicationsCatalogService;

    @MockitoBean
    JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void create_whenValidRequest_returns201() throws Exception {
        UUID id = UUID.randomUUID();
        MedicationResponse response = new MedicationResponse(
                id, "MED-1", "Amoxicilina", "desc", new BigDecimal("12.50"),
                Unit.TABLET, true, true, null, null);
        when(medicationsCatalogService.createMedication(any())).thenReturn(response);

        String body = """
                {
                  "code": "MED-1",
                  "name": "Amoxicilina",
                  "description": "desc",
                  "price": 12.50,
                  "unit": "tablet",
                  "requiresPrescription": true
                }
                """;

        mockMvc.perform(post("/api/v1/catalog/medications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.unit").value("tablet"))
                .andExpect(jsonPath("$.requiresPrescription").value(true));
    }

    @Test
    void create_whenInvalidRequest_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/catalog/medications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void getByCode_whenNotFound_returns404() throws Exception {
        when(medicationsCatalogService.getMedicationByCode("NOPE"))
                .thenThrow(new EntityNotFoundException("No existe"));

        mockMvc.perform(get("/api/v1/catalog/medications/code/{code}", "NOPE"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void list_whenFiltered_returnsPage() throws Exception {
        MedicationSummaryResponse summary = new MedicationSummaryResponse(
                UUID.randomUUID(), "MED-1", "Amoxicilina", new BigDecimal("12.50"), Unit.TABLET);
        var page = new org.springframework.data.domain.PageImpl<>(List.of(summary),
                org.springframework.data.domain.PageRequest.of(0, 20), 1);
        when(medicationsCatalogService.searchMedications(any(), any(), any(), any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/catalog/medications")
                        .param("active", "true")
                        .param("unit", "TABLET")
                        .param("requiresPrescription", "true")
                        .param("q", "amo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].code").value("MED-1"))
                .andExpect(jsonPath("$.content[0].unit").value("tablet"));
    }

    @Test
    void list_whenBusinessRuleFails_returns422() throws Exception {
        when(medicationsCatalogService.searchMedications(any(), any(), any(), any(), any()))
                .thenThrow(new BusinessRuleException("al menos 2 caracteres"));

        mockMvc.perform(get("/api/v1/catalog/medications").param("q", "a"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.status").value(422));
    }

    @Test
    void deactivate_returns204() throws Exception {
        mockMvc.perform(delete("/api/v1/catalog/medications/{id}", UUID.randomUUID()))
                .andExpect(status().isNoContent());
    }

    @Test
    void update_whenValidRequest_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        MedicationResponse response = new MedicationResponse(
                id, "MED-1", "Amoxicilina", "nuevo", new BigDecimal("15.00"),
                Unit.TABLET, true, true, null, null);
        when(medicationsCatalogService.updateMedication(any(), any())).thenReturn(response);

        String body = """
                {
                  "name": "Amoxicilina",
                  "description": "nuevo",
                  "price": 15.00,
                  "unit": "tablet",
                  "requiresPrescription": true,
                  "isActive": true
                }
                """;

        mockMvc.perform(put("/api/v1/catalog/medications/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.price").value(15.00));
    }
}
