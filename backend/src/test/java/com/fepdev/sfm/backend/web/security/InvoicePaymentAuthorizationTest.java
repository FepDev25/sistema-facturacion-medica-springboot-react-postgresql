package com.fepdev.sfm.backend.web.security;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fepdev.sfm.backend.config.SecurityConfig;
import com.fepdev.sfm.backend.domain.invoice.InvoiceController;
import com.fepdev.sfm.backend.domain.invoice.InvoiceService;
import com.fepdev.sfm.backend.domain.invoice.ItemType;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemResponse;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceResponse;
import com.fepdev.sfm.backend.domain.payment.PaymentController;
import com.fepdev.sfm.backend.domain.payment.PaymentService;
import com.fepdev.sfm.backend.domain.payment.dto.PaymentResponse;
import com.fepdev.sfm.backend.security.AuthCookieService;
import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;
import com.fepdev.sfm.backend.security.JwtService;
import com.fepdev.sfm.backend.security.TokenBlacklistService;
import com.fepdev.sfm.backend.security.UserDetailsServiceImpl;
import com.fepdev.sfm.backend.shared.exception.HandlerException;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

// Verifica la matriz RBAC de facturas y pagos directamente sobre el filtro de seguridad.
@WebMvcTest({InvoiceController.class, PaymentController.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, HandlerException.class})
class InvoicePaymentAuthorizationTest {

    private static final String ITEM_BODY = """
            {
              "itemType": "service",
              "description": "Consulta",
              "quantity": 1,
              "unitPrice": 100.00
            }
            """;

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    InvoiceService invoiceService;

    @MockitoBean
    PaymentService paymentService;

    @MockitoBean
    JwtService jwtService;

    @MockitoBean
    UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    AuthCookieService authCookieService;

    @MockitoBean
    TokenBlacklistService tokenBlacklistService;

    @Test
    void admin_canAddInvoiceItem() throws Exception {
        UUID invoiceId = UUID.randomUUID();
        when(invoiceService.addItem(any(), any()))
                .thenReturn(new InvoiceItemResponse(
                        UUID.randomUUID(),
                        invoiceId,
                        null,
                        null,
                        null,
                        null,
                        ItemType.SERVICE,
                        "Consulta",
                        1,
                        new BigDecimal("100.00"),
                        new BigDecimal("100.00"),
                        OffsetDateTime.now()));

        mockMvc.perform(post("/api/v1/invoices/{id}/items", invoiceId)
                        .with(user("admin").authorities(() -> "ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ITEM_BODY))
                .andExpect(status().isCreated());
    }

    @Test
    void doctor_cannotAddInvoiceItem() throws Exception {
        UUID invoiceId = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/invoices/{id}/items", invoiceId)
                        .with(user("doctor").authorities(() -> "DOCTOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ITEM_BODY))
                .andExpect(status().isForbidden());

        verify(invoiceService, never()).addItem(any(), any());
    }

    @Test
    void receptionist_cannotAddInvoiceItem() throws Exception {
        UUID invoiceId = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/invoices/{id}/items", invoiceId)
                        .with(user("receptionist").authorities(() -> "RECEPTIONIST"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ITEM_BODY))
                .andExpect(status().isForbidden());

        verify(invoiceService, never()).addItem(any(), any());
    }

    @Test
    void doctor_cannotReadInvoices() throws Exception {
        UUID invoiceId = UUID.randomUUID();

        mockMvc.perform(get("/api/v1/invoices/{id}", invoiceId)
                        .with(user("doctor").authorities(() -> "DOCTOR")))
                .andExpect(status().isForbidden());

        verify(invoiceService, never()).getInvoiceById(any());
    }

    @Test
    void receptionist_canReadInvoices() throws Exception {
        UUID invoiceId = UUID.randomUUID();
        when(invoiceService.getInvoiceById(invoiceId))
                .thenReturn(new InvoiceResponse(
                        invoiceId,
                        UUID.randomUUID(),
                        "Ana",
                        "Lopez",
                        null,
                        null,
                        "FAC-2026-00001",
                        new BigDecimal("100.00"),
                        BigDecimal.ZERO,
                        new BigDecimal("100.00"),
                        BigDecimal.ZERO,
                        new BigDecimal("100.00"),
                        com.fepdev.sfm.backend.domain.invoice.InvoiceStatus.PENDING,
                        java.time.LocalDate.now(),
                        java.time.LocalDate.now().plusDays(30),
                        null,
                        java.util.List.of(),
                        null,
                        null));

        mockMvc.perform(get("/api/v1/invoices/{id}", invoiceId)
                        .with(user("receptionist").authorities(() -> "RECEPTIONIST")))
                .andExpect(status().isOk());
    }

    @Test
    void receptionist_canRegisterPayment() throws Exception {
        UUID invoiceId = UUID.randomUUID();
        when(paymentService.registerPayment(any()))
                .thenReturn(new PaymentResponse(
                        UUID.randomUUID(),
                        invoiceId,
                        "FAC-2026-00001",
                        new BigDecimal("20.00"),
                        com.fepdev.sfm.backend.domain.payment.PaymentMethod.CASH,
                        null,
                        null,
                        OffsetDateTime.now(),
                        OffsetDateTime.now()));

        mockMvc.perform(post("/api/v1/payments")
                        .with(user("receptionist").authorities(() -> "RECEPTIONIST"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "invoiceId": "%s",
                                  "amount": 20.00,
                                  "paymentMethod": "cash",
                                  "paymentDate": "2026-11-08T10:00:00-05:00"
                                }
                                """.formatted(invoiceId)))
                .andExpect(status().isCreated());
    }

    @Test
    void doctor_cannotRegisterPayment() throws Exception {
        UUID invoiceId = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/payments")
                        .with(user("doctor").authorities(() -> "DOCTOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "invoiceId": "%s",
                                  "amount": 20.00,
                                  "paymentMethod": "cash",
                                  "paymentDate": "2026-11-08T10:00:00-05:00"
                                }
                                """.formatted(invoiceId)))
                .andExpect(status().isForbidden());

        verify(paymentService, never()).registerPayment(any());
    }
}
