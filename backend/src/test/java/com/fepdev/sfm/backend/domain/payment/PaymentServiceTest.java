package com.fepdev.sfm.backend.domain.payment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;

import com.fepdev.sfm.backend.domain.invoice.Invoice;
import com.fepdev.sfm.backend.domain.invoice.InvoiceRepository;
import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;
import com.fepdev.sfm.backend.domain.payment.dto.PaymentCreateRequest;
import com.fepdev.sfm.backend.domain.payment.dto.PaymentResponse;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock PaymentRepository paymentRepository;
    @Mock PaymentMapper paymentMapper;
    @Mock InvoiceRepository invoiceRepository;

    @InjectMocks PaymentService paymentService;

    // invoiceId, amount, paymentMethod, referenceNumber, notes, paymentDate
    private PaymentCreateRequest paymentRequest(UUID invoiceId, BigDecimal amount) {
        return new PaymentCreateRequest(
            invoiceId, amount, PaymentMethod.CASH, null, null, OffsetDateTime.now());
    }

    private Invoice invoiceWith(InvoiceStatus status, BigDecimal total) {
        Invoice invoice = new Invoice();
        invoice.setStatus(status);
        invoice.setTotal(total);
        return invoice;
    }

    // =========================================================
    // registerPayment — validaciones
    // =========================================================

    @Test
    void registerPayment_whenInvoiceNotFound_throwsEntityNotFoundException() {
        UUID invoiceId = UUID.randomUUID();
        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.registerPayment(paymentRequest(invoiceId, BigDecimal.TEN)))
            .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void registerPayment_whenInvoiceDraft_throwsBusinessRuleException() {
        UUID invoiceId = UUID.randomUUID();
        when(invoiceRepository.findById(invoiceId))
            .thenReturn(Optional.of(invoiceWith(InvoiceStatus.DRAFT, new BigDecimal("200.00"))));

        assertThatThrownBy(() -> paymentService.registerPayment(paymentRequest(invoiceId, BigDecimal.TEN)))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("PENDING");
    }

    @Test
    void registerPayment_whenInvoiceCancelled_throwsBusinessRuleException() {
        UUID invoiceId = UUID.randomUUID();
        when(invoiceRepository.findById(invoiceId))
            .thenReturn(Optional.of(invoiceWith(InvoiceStatus.CANCELLED, new BigDecimal("200.00"))));

        assertThatThrownBy(() -> paymentService.registerPayment(paymentRequest(invoiceId, BigDecimal.TEN)))
            .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void registerPayment_whenInvoiceAlreadyPaid_throwsBusinessRuleException() {
        UUID invoiceId = UUID.randomUUID();
        when(invoiceRepository.findById(invoiceId))
                .thenReturn(Optional.of(invoiceWith(InvoiceStatus.PAID, new BigDecimal("200.00"))));

        assertThatThrownBy(() -> paymentService.registerPayment(paymentRequest(invoiceId, BigDecimal.ONE)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("No se pueden registrar pagos");
    }

    @Test
    void registerPayment_whenAmountExceedsPendingBalance_throwsBusinessRuleException() {
        UUID invoiceId = UUID.randomUUID();
        // total=100, alreadyPaid=60, pendingBalance=40, newPayment=50 → excede
        when(invoiceRepository.findById(invoiceId))
            .thenReturn(Optional.of(invoiceWith(InvoiceStatus.PENDING, new BigDecimal("100.00"))));
        when(paymentRepository.sumAmountByInvoiceId(invoiceId)).thenReturn(new BigDecimal("60.00"));

        assertThatThrownBy(() -> paymentService.registerPayment(paymentRequest(invoiceId, new BigDecimal("50.00"))))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("saldo pendiente");
    }

    @Test
    void registerPayment_whenAmountEqualsPendingBalance_marksInvoiceAsPaid() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = invoiceWith(InvoiceStatus.PENDING, new BigDecimal("100.00"));
        Payment payment = new Payment();

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumAmountByInvoiceId(invoiceId)).thenReturn(new BigDecimal("60.00"));
        when(paymentMapper.toEntity(any())).thenReturn(payment);
        when(paymentRepository.save(payment)).thenReturn(payment);
        when(invoiceRepository.save(invoice)).thenReturn(invoice);
        when(paymentMapper.toResponse(payment)).thenReturn(null);

        paymentService.registerPayment(paymentRequest(invoiceId, new BigDecimal("40.00")));

        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PAID);
    }

    // =========================================================
    // registerPayment — transiciones de estado
    // =========================================================

    @Test
    void registerPayment_whenFullPayment_setsInvoiceStatusPaid() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = invoiceWith(InvoiceStatus.PENDING, new BigDecimal("100.00"));
        Payment payment = new Payment();
        PaymentResponse response = new PaymentResponse(
            UUID.randomUUID(), invoiceId, null, new BigDecimal("100.00"), PaymentMethod.CASH, null, null, null, null);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumAmountByInvoiceId(invoiceId)).thenReturn(BigDecimal.ZERO);
        when(paymentMapper.toEntity(any())).thenReturn(payment);
        when(paymentRepository.save(payment)).thenReturn(payment);
        when(invoiceRepository.save(invoice)).thenReturn(invoice);
        when(paymentMapper.toResponse(payment)).thenReturn(response);

        paymentService.registerPayment(paymentRequest(invoiceId, new BigDecimal("100.00")));

        ArgumentCaptor<Invoice> invoiceCaptor = ArgumentCaptor.forClass(Invoice.class);
        verify(invoiceRepository).save(invoiceCaptor.capture());
        assertThat(invoiceCaptor.getValue().getStatus()).isEqualTo(InvoiceStatus.PAID);
    }

    @Test
    void registerPayment_whenPartialPayment_setsInvoiceStatusPartialPaid() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = invoiceWith(InvoiceStatus.PENDING, new BigDecimal("200.00"));
        Payment payment = new Payment();
        PaymentResponse response = new PaymentResponse(
            UUID.randomUUID(), invoiceId, null, new BigDecimal("80.00"), PaymentMethod.CASH, null, null, null, null);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumAmountByInvoiceId(invoiceId)).thenReturn(BigDecimal.ZERO);
        when(paymentMapper.toEntity(any())).thenReturn(payment);
        when(paymentRepository.save(payment)).thenReturn(payment);
        when(invoiceRepository.save(invoice)).thenReturn(invoice);
        when(paymentMapper.toResponse(payment)).thenReturn(response);

        paymentService.registerPayment(paymentRequest(invoiceId, new BigDecimal("80.00")));

        ArgumentCaptor<Invoice> captor = ArgumentCaptor.forClass(Invoice.class);
        verify(invoiceRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(InvoiceStatus.PARTIAL_PAID);
    }

    @Test
    void registerPayment_fromOverdueInvoice_isAcceptedAndSetsPartialPaid() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = invoiceWith(InvoiceStatus.OVERDUE, new BigDecimal("500.00"));
        Payment payment = new Payment();

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumAmountByInvoiceId(invoiceId)).thenReturn(BigDecimal.ZERO);
        when(paymentMapper.toEntity(any())).thenReturn(payment);
        when(paymentRepository.save(payment)).thenReturn(payment);
        when(invoiceRepository.save(invoice)).thenReturn(invoice);
        when(paymentMapper.toResponse(payment)).thenReturn(null);

        paymentService.registerPayment(paymentRequest(invoiceId, new BigDecimal("200.00")));

        ArgumentCaptor<Invoice> captor = ArgumentCaptor.forClass(Invoice.class);
        verify(invoiceRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(InvoiceStatus.PARTIAL_PAID);
    }

    @Test
    void registerPayment_cumulativePayments_pendingBalanceConsidersExistingPayments() {
        UUID invoiceId = UUID.randomUUID();
        // total=100, yaAbonado=60, pendingBalance=40, nuevoAbono=40 → exactamente el saldo restante
        Invoice invoice = invoiceWith(InvoiceStatus.PARTIAL_PAID, new BigDecimal("100.00"));
        Payment payment = new Payment();

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumAmountByInvoiceId(invoiceId)).thenReturn(new BigDecimal("60.00"));
        when(paymentMapper.toEntity(any())).thenReturn(payment);
        when(paymentRepository.save(payment)).thenReturn(payment);
        when(invoiceRepository.save(invoice)).thenReturn(invoice);
        when(paymentMapper.toResponse(payment)).thenReturn(null);

        paymentService.registerPayment(paymentRequest(invoiceId, new BigDecimal("40.00")));

        ArgumentCaptor<Invoice> captor = ArgumentCaptor.forClass(Invoice.class);
        verify(invoiceRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(InvoiceStatus.PAID);
    }

    @Test
    void registerPayment_whenPendingBalanceIsZero_rejectsAdditionalPayment() {
        UUID invoiceId = UUID.randomUUID();
        when(invoiceRepository.findById(invoiceId))
                .thenReturn(Optional.of(invoiceWith(InvoiceStatus.PARTIAL_PAID, new BigDecimal("100.00"))));
        when(paymentRepository.sumAmountByInvoiceId(invoiceId)).thenReturn(new BigDecimal("100.00"));

        assertThatThrownBy(() -> paymentService.registerPayment(paymentRequest(invoiceId, new BigDecimal("0.01"))))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("saldo pendiente");
    }

    @Test
    void registerPayment_savesPaymentLinkedToInvoiceAndReturnsMappedResponse() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = invoiceWith(InvoiceStatus.PENDING, new BigDecimal("300.00"));
        Payment mappedEntity = new Payment();
        PaymentResponse mappedResponse = new PaymentResponse(
                UUID.randomUUID(),
                invoiceId,
                "FAC-2026-10001",
                new BigDecimal("150.00"),
                PaymentMethod.BANK_TRANSFER,
                "TX-1",
                "abono",
                OffsetDateTime.now(),
                OffsetDateTime.now());

        PaymentCreateRequest request = new PaymentCreateRequest(
                invoiceId,
                new BigDecimal("150.00"),
                PaymentMethod.BANK_TRANSFER,
                "TX-1",
                "abono",
                OffsetDateTime.now());

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumAmountByInvoiceId(invoiceId)).thenReturn(BigDecimal.ZERO);
        when(paymentMapper.toEntity(request)).thenReturn(mappedEntity);
        when(paymentRepository.save(mappedEntity)).thenReturn(mappedEntity);
        when(invoiceRepository.save(invoice)).thenReturn(invoice);
        when(paymentMapper.toResponse(mappedEntity)).thenReturn(mappedResponse);

        PaymentResponse result = paymentService.registerPayment(request);

        assertThat(result).isEqualTo(mappedResponse);
        assertThat(mappedEntity.getInvoice()).isEqualTo(invoice);
    }

    @Test
    void registerPayment_whenInvoiceIsPartialPaidAndExactRemaining_isMarkedPaid() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = invoiceWith(InvoiceStatus.PARTIAL_PAID, new BigDecimal("250.00"));
        Payment payment = new Payment();

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumAmountByInvoiceId(invoiceId)).thenReturn(new BigDecimal("200.00"));
        when(paymentMapper.toEntity(any())).thenReturn(payment);
        when(paymentRepository.save(payment)).thenReturn(payment);
        when(invoiceRepository.save(invoice)).thenReturn(invoice);
        when(paymentMapper.toResponse(payment)).thenReturn(null);

        paymentService.registerPayment(paymentRequest(invoiceId, new BigDecimal("50.00")));

        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PAID);
    }

    // =========================================================
    // getPaymentsByInvoice
    // =========================================================

    @Test
    void getPaymentsByInvoice_whenInvoiceNotFound_throwsEntityNotFoundException() {
        UUID invoiceId = UUID.randomUUID();
        when(invoiceRepository.existsById(invoiceId)).thenReturn(false);

        assertThatThrownBy(() -> paymentService.getPaymentsByInvoice(invoiceId, Pageable.unpaged()))
            .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void getPaymentsByInvoice_whenInvoiceExists_returnsMappedPage() {
        UUID invoiceId = UUID.randomUUID();
        Pageable pageable = Pageable.ofSize(10);
        Payment payment = new Payment();
        PaymentResponse response = new PaymentResponse(
                UUID.randomUUID(),
                invoiceId,
                "FAC-2026-20002",
                new BigDecimal("50.00"),
                PaymentMethod.CASH,
                null,
                null,
                OffsetDateTime.now(),
                OffsetDateTime.now());

        when(invoiceRepository.existsById(invoiceId)).thenReturn(true);
        when(paymentRepository.findByInvoiceIdOrderByPaymentDateDesc(eq(invoiceId), eq(pageable)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(java.util.List.of(payment), pageable, 1));
        when(paymentMapper.toResponse(payment)).thenReturn(response);

        Page<PaymentResponse> result = paymentService.getPaymentsByInvoice(invoiceId, pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().getFirst().invoiceId()).isEqualTo(invoiceId);
        verify(paymentRepository).findByInvoiceIdOrderByPaymentDateDesc(invoiceId, pageable);
    }

    @Test
    void getPaymentsByInvoice_whenMultiplePayments_returnsAllMapped() {
        UUID invoiceId = UUID.randomUUID();
        Pageable pageable = Pageable.ofSize(10);
        Payment p1 = new Payment();
        Payment p2 = new Payment();
        PaymentResponse r1 = new PaymentResponse(
                UUID.randomUUID(), invoiceId, "FAC-1", new BigDecimal("10.00"), PaymentMethod.CASH,
                null, null, OffsetDateTime.now(), OffsetDateTime.now());
        PaymentResponse r2 = new PaymentResponse(
                UUID.randomUUID(), invoiceId, "FAC-1", new BigDecimal("20.00"), PaymentMethod.CREDIT_CARD,
                "REF-2", null, OffsetDateTime.now(), OffsetDateTime.now());

        when(invoiceRepository.existsById(invoiceId)).thenReturn(true);
        when(paymentRepository.findByInvoiceIdOrderByPaymentDateDesc(eq(invoiceId), eq(pageable)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(p1, p2), pageable, 2));
        when(paymentMapper.toResponse(p1)).thenReturn(r1);
        when(paymentMapper.toResponse(p2)).thenReturn(r2);

        Page<PaymentResponse> result = paymentService.getPaymentsByInvoice(invoiceId, pageable);

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent().get(1).paymentMethod()).isEqualTo(PaymentMethod.CREDIT_CARD);
    }
}
