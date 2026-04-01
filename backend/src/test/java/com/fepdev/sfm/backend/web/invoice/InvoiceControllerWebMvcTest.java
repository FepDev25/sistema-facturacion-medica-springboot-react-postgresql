package com.fepdev.sfm.backend.web.invoice;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fepdev.sfm.backend.domain.invoice.InvoiceController;
import com.fepdev.sfm.backend.domain.invoice.InvoiceService;
import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;
import com.fepdev.sfm.backend.domain.invoice.ItemType;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemRequest;
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
    void addItem_whenValidRequest_serializesEnumAndAmount() throws Exception {
        UUID id = UUID.randomUUID();
        UUID serviceId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        var response = new com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemResponse(
                itemId,
                id,
                serviceId,
                "Consulta",
                null,
                null,
                ItemType.SERVICE,
                "Consulta general",
                2,
                new BigDecimal("50.00"),
                new BigDecimal("100.00"),
                null);

        when(invoiceService.addItem(any(), any())).thenReturn(response);

        String body = """
                {
                  "serviceId": "%s",
                  "itemType": "SERVICE",
                  "description": "Consulta general",
                  "quantity": 2,
                  "unitPrice": 50.00
                }
                """.formatted(serviceId);

        mockMvc.perform(post("/api/v1/invoices/{id}/items", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(itemId.toString()))
                .andExpect(jsonPath("$.itemType").value("service"))
                .andExpect(jsonPath("$.subtotal").value(100.00))
                .andExpect(jsonPath("$.quantity").value(2));

        ArgumentCaptor<InvoiceItemRequest> requestCaptor = ArgumentCaptor.forClass(InvoiceItemRequest.class);
        verify(invoiceService).addItem(org.mockito.ArgumentMatchers.eq(id), requestCaptor.capture());
        var sent = requestCaptor.getValue();
        org.assertj.core.api.Assertions.assertThat(sent.itemType()).isEqualTo(ItemType.SERVICE);
        org.assertj.core.api.Assertions.assertThat(sent.quantity()).isEqualTo(2);
        org.assertj.core.api.Assertions.assertThat(sent.unitPrice()).isEqualByComparingTo("50.00");
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

    @Test
    void confirm_whenServiceSucceeds_returnsUpdatedInvoiceResponse() throws Exception {
        UUID id = UUID.randomUUID();
        InvoiceResponse response = new InvoiceResponse(
                id, UUID.randomUUID(), "Ana", "Lopez", UUID.randomUUID(), null, "FAC-2026-00012",
                new BigDecimal("100.00"), new BigDecimal("15.00"), new BigDecimal("115.00"),
                BigDecimal.ZERO, new BigDecimal("115.00"), InvoiceStatus.PENDING,
                LocalDate.now(), LocalDate.now().plusDays(30), "ok", List.of(), null, null);

        when(invoiceService.getInvoiceById(id)).thenReturn(response);

        mockMvc.perform(patch("/api/v1/invoices/{id}/confirm", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("pending"))
                .andExpect(jsonPath("$.invoiceNumber").value("FAC-2026-00012"));

        verify(invoiceService).confirmInvoice(id);
    }

    @Test
    void list_whenStatusAndDateFiltersProvided_returnsPage() throws Exception {
        UUID patientId = UUID.randomUUID();
        InvoiceResponse response = new InvoiceResponse(
                UUID.randomUUID(), patientId, "Ana", "Lopez", null, null, "FAC-2026-00021",
                new BigDecimal("200.00"), new BigDecimal("30.00"), new BigDecimal("230.00"),
                BigDecimal.ZERO, new BigDecimal("230.00"), InvoiceStatus.OVERDUE,
                LocalDate.now(), LocalDate.now().plusDays(30), null, List.of(), null, null);
        var page = new org.springframework.data.domain.PageImpl<>(List.of(response), org.springframework.data.domain.PageRequest.of(0, 20), 1);

        when(invoiceService.getInvoicesWithFilters(any(), any(), any(), any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/invoices")
                        .param("patientId", patientId.toString())
                        .param("status", "OVERDUE")
                        .param("startDate", LocalDate.now().minusDays(10).toString())
                        .param("endDate", LocalDate.now().plusDays(10).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].status").value("overdue"))
                .andExpect(jsonPath("$.content[0].invoiceNumber").value("FAC-2026-00021"));
    }

    @Test
    void getByNumber_whenFound_returns200() throws Exception {
        String number = "FAC-2026-00077";
        InvoiceResponse response = new InvoiceResponse(
                UUID.randomUUID(), UUID.randomUUID(), "Ana", "Lopez", null, null, number,
                new BigDecimal("100.00"), new BigDecimal("15.00"), new BigDecimal("115.00"),
                BigDecimal.ZERO, new BigDecimal("115.00"), InvoiceStatus.PENDING,
                LocalDate.now(), LocalDate.now().plusDays(30), null, List.of(), null, null);
        when(invoiceService.getInvoiceByNumber(number)).thenReturn(response);

        mockMvc.perform(get("/api/v1/invoices/number/{invoiceNumber}", number))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.invoiceNumber").value(number));
    }

    @Test
    void markOverdue_and_cancel_whenSuccess_returnUpdatedInvoice() throws Exception {
        UUID id = UUID.randomUUID();
        InvoiceResponse overdueResponse = new InvoiceResponse(
                id, UUID.randomUUID(), "Ana", "Lopez", null, null, "FAC-2026-00033",
                new BigDecimal("80.00"), new BigDecimal("12.00"), new BigDecimal("92.00"),
                BigDecimal.ZERO, new BigDecimal("92.00"), InvoiceStatus.OVERDUE,
                LocalDate.now(), LocalDate.now().plusDays(30), null, List.of(), null, null);
        InvoiceResponse cancelledResponse = new InvoiceResponse(
                id, UUID.randomUUID(), "Ana", "Lopez", null, null, "FAC-2026-00033",
                new BigDecimal("80.00"), new BigDecimal("12.00"), new BigDecimal("92.00"),
                BigDecimal.ZERO, new BigDecimal("92.00"), InvoiceStatus.CANCELLED,
                LocalDate.now(), LocalDate.now().plusDays(30), null, List.of(), null, null);

        when(invoiceService.getInvoiceById(id)).thenReturn(overdueResponse, cancelledResponse);

        mockMvc.perform(MockMvcRequestBuilders.patch("/api/v1/invoices/{id}/overdue", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("overdue"));
        verify(invoiceService).markOverdue(id);

        mockMvc.perform(MockMvcRequestBuilders.patch("/api/v1/invoices/{id}/cancel", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("cancelled"));
        verify(invoiceService).cancelInvoice(id);
    }
}
