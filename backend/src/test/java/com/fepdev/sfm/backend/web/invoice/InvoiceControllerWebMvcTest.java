package com.fepdev.sfm.backend.web.invoice;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
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

import com.fepdev.sfm.backend.domain.invoice.InvoiceController;
import com.fepdev.sfm.backend.domain.invoice.InvoiceService;
import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceResponse;
import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;
import com.fepdev.sfm.backend.shared.exception.HandlerException;

import jakarta.persistence.EntityNotFoundException;

@WebMvcTest(InvoiceController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(HandlerException.class)
class InvoiceControllerWebMvcTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    InvoiceService invoiceService;

    @MockitoBean
    JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void getById_whenFound_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        InvoiceResponse response = new InvoiceResponse(
                id, UUID.randomUUID(), "Ana", "Lopez", UUID.randomUUID(), null, "FAC-2026-00001",
                new BigDecimal("100.00"), new BigDecimal("15.00"), new BigDecimal("115.00"),
                BigDecimal.ZERO, new BigDecimal("115.00"), InvoiceStatus.PENDING,
                LocalDate.now(), LocalDate.now().plusDays(30), null, List.of(), null, null);

        when(invoiceService.getInvoiceById(id)).thenReturn(response);

        mockMvc.perform(get("/api/v1/invoices/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()));
    }

    @Test
    void addItem_whenInvalidRequest_returns400() throws Exception {
        UUID id = UUID.randomUUID();
        mockMvc.perform(post("/api/v1/invoices/{id}/items", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void getById_whenNotFound_returns404() throws Exception {
        UUID id = UUID.randomUUID();
        when(invoiceService.getInvoiceById(id)).thenThrow(new EntityNotFoundException("No encontrada"));

        mockMvc.perform(get("/api/v1/invoices/{id}", id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void removeItem_whenBusinessRuleFails_returns422() throws Exception {
        UUID invoiceId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        doThrow(new BusinessRuleException("No permitido")).when(invoiceService).removeItem(invoiceId, itemId);

        mockMvc.perform(delete("/api/v1/invoices/{invoiceId}/items/{itemId}", invoiceId, itemId))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.status").value(422));
    }
}
