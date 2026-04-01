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

import com.fepdev.sfm.backend.domain.catalog.Category;
import com.fepdev.sfm.backend.domain.catalog.ServiceCatalogController;
import com.fepdev.sfm.backend.domain.catalog.ServiceCatalogService;
import com.fepdev.sfm.backend.domain.catalog.dto.ServiceResponse;
import com.fepdev.sfm.backend.domain.catalog.dto.ServiceSummaryResponse;
import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;
import com.fepdev.sfm.backend.shared.exception.HandlerException;

import jakarta.persistence.EntityNotFoundException;

@WebMvcTest(ServiceCatalogController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(HandlerException.class)
class ServiceCatalogControllerWebMvcTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    ServiceCatalogService serviceCatalogService;

    @MockitoBean
    JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void create_whenValidRequest_returns201() throws Exception {
        UUID id = UUID.randomUUID();
        ServiceResponse response = new ServiceResponse(
                id, "SRV-1", "Consulta", "desc", new BigDecimal("50.00"),
                Category.CONSULTATION, true, null, null);
        when(serviceCatalogService.createServicesCatalog(any())).thenReturn(response);

        String body = """
                {
                  "code": "SRV-1",
                  "name": "Consulta",
                  "description": "desc",
                  "price": 50.00,
                  "category": "consultation"
                }
                """;

        mockMvc.perform(post("/api/v1/catalog/services")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.category").value("consultation"));
    }

    @Test
    void create_whenInvalidRequest_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/catalog/services")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void update_whenNotFound_returns404() throws Exception {
        UUID id = UUID.randomUUID();
        when(serviceCatalogService.updateServiceCatalog(any(), any()))
                .thenThrow(new EntityNotFoundException("No existe"));

        String body = """
                {
                  "name": "Consulta",
                  "price": 75.00,
                  "isActive": true
                }
                """;

        mockMvc.perform(put("/api/v1/catalog/services/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void list_whenFiltered_returnsPage() throws Exception {
        ServiceSummaryResponse summary = new ServiceSummaryResponse(
                UUID.randomUUID(), "SRV-1", "Consulta", new BigDecimal("50.00"), Category.CONSULTATION, true);
        var page = new org.springframework.data.domain.PageImpl<>(List.of(summary),
                org.springframework.data.domain.PageRequest.of(0, 20), 1);
        when(serviceCatalogService.getServiceCatalogs(any(), any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/catalog/services")
                        .param("category", "CONSULTATION")
                        .param("active", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].code").value("SRV-1"))
                .andExpect(jsonPath("$.content[0].category").value("consultation"));
    }

    @Test
    void search_whenTermTooShort_returns422() throws Exception {
        when(serviceCatalogService.searchServicesByName("a"))
                .thenThrow(new BusinessRuleException("al menos 2 caracteres"));

        mockMvc.perform(get("/api/v1/catalog/services/search").param("q", "a"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.status").value(422));
    }

    @Test
    void deactivate_returns204() throws Exception {
        mockMvc.perform(delete("/api/v1/catalog/services/{id}", UUID.randomUUID()))
                .andExpect(status().isNoContent());
    }
}
