package com.fepdev.sfm.backend.web.payment;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fepdev.sfm.backend.domain.payment.PaymentController;
import com.fepdev.sfm.backend.domain.payment.PaymentMethod;
import com.fepdev.sfm.backend.domain.payment.PaymentService;
import com.fepdev.sfm.backend.domain.payment.dto.PaymentResponse;
import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;
import com.fepdev.sfm.backend.shared.exception.HandlerException;

import jakarta.persistence.EntityNotFoundException;

@WebMvcTest(PaymentController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(HandlerException.class)
class PaymentControllerWebMvcTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    PaymentService paymentService;

    @MockitoBean
    JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void register_whenValidRequest_returns201() throws Exception {
        UUID id = UUID.randomUUID();
        UUID invoiceId = UUID.randomUUID();
        PaymentResponse response = new PaymentResponse(id, invoiceId, "FAC-2026-0001", new BigDecimal("20.00"),
                PaymentMethod.CASH, null, null, OffsetDateTime.now(), OffsetDateTime.now());

        when(paymentService.registerPayment(any())).thenReturn(response);

        String body = """
                {
                  "invoiceId": "%s",
                  "amount": 20.00,
                  "paymentMethod": "cash",
                  "paymentDate": "%s"
                }
                """.formatted(invoiceId, OffsetDateTime.now());

        mockMvc.perform(post("/api/v1/payments").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(id.toString()));
    }

    @Test
    void register_whenInvalidRequest_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/payments").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void getByInvoice_whenNotFound_returns404() throws Exception {
        UUID invoiceId = UUID.randomUUID();
        when(paymentService.getPaymentsByInvoice(any(), any())).thenThrow(new EntityNotFoundException("No encontrada"));

        mockMvc.perform(get("/api/v1/payments/invoice/{invoiceId}", invoiceId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void register_whenBusinessRuleFails_returns422() throws Exception {
        UUID invoiceId = UUID.randomUUID();
        when(paymentService.registerPayment(any())).thenThrow(new BusinessRuleException("Saldo insuficiente"));

        String body = """
                {
                  "invoiceId": "%s",
                  "amount": 999.99,
                  "paymentMethod": "cash",
                  "paymentDate": "%s"
                }
                """.formatted(invoiceId, OffsetDateTime.now());

        mockMvc.perform(post("/api/v1/payments").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.status").value(422));
    }
}
