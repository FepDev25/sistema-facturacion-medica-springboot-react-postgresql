package com.fepdev.sfm.backend.domain.payment;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.domain.invoice.Invoice;
import com.fepdev.sfm.backend.domain.payment.dto.PaymentCreateRequest;

class PaymentMapperImplTest {

    private final PaymentMapper mapper = new PaymentMapperImpl();

    @Test
    void toEntity_mapsCreateRequest() {
        OffsetDateTime paymentDate = OffsetDateTime.now();
        PaymentCreateRequest request = new PaymentCreateRequest(
                UUID.randomUUID(),
                new BigDecimal("25.50"),
                PaymentMethod.DEBIT_CARD,
                "REF-001",
                "nota",
                paymentDate);

        Payment entity = mapper.toEntity(request);

        assertThat(entity.getAmount()).isEqualByComparingTo("25.50");
        assertThat(entity.getPaymentMethod()).isEqualTo(PaymentMethod.DEBIT_CARD);
        assertThat(entity.getReferenceNumber()).isEqualTo("REF-001");
        assertThat(entity.getPaymentDate()).isEqualTo(paymentDate);
        assertThat(entity.getInvoice()).isNull();
    }

    @Test
    void toResponse_mapsInvoiceFields() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = new Invoice();
        ReflectionTestUtils.setField(invoice, "id", invoiceId);
        invoice.setInvoiceNumber("FAC-2026-12345");

        Payment payment = new Payment();
        ReflectionTestUtils.setField(payment, "id", UUID.randomUUID());
        payment.setInvoice(invoice);
        payment.setAmount(new BigDecimal("10.00"));
        payment.setPaymentMethod(PaymentMethod.CASH);
        payment.setPaymentDate(OffsetDateTime.now());

        var response = mapper.toResponse(payment);

        assertThat(response.invoiceId()).isEqualTo(invoiceId);
        assertThat(response.invoiceNumber()).isEqualTo("FAC-2026-12345");
        assertThat(response.amount()).isEqualByComparingTo("10.00");
        assertThat(response.paymentMethod()).isEqualTo(PaymentMethod.CASH);
    }

    @Test
    void mapper_nullAndListPaths_areCovered() {
        assertThat(mapper.toEntity(null)).isNull();
        assertThat(mapper.toResponse(null)).isNull();
        assertThat(mapper.toResponseList(null)).isNull();

        Payment withoutInvoice = new Payment();
        ReflectionTestUtils.setField(withoutInvoice, "id", UUID.randomUUID());
        withoutInvoice.setAmount(new BigDecimal("5.00"));
        withoutInvoice.setPaymentMethod(PaymentMethod.CASH);
        withoutInvoice.setPaymentDate(OffsetDateTime.now());

        Payment withInvoice = new Payment();
        ReflectionTestUtils.setField(withInvoice, "id", UUID.randomUUID());
        Invoice invoice = new Invoice();
        ReflectionTestUtils.setField(invoice, "id", UUID.randomUUID());
        invoice.setInvoiceNumber("FAC-2026-77777");
        withInvoice.setInvoice(invoice);
        withInvoice.setAmount(new BigDecimal("12.00"));
        withInvoice.setPaymentMethod(PaymentMethod.DEBIT_CARD);
        withInvoice.setPaymentDate(OffsetDateTime.now());

        var list = mapper.toResponseList(List.of(withoutInvoice, withInvoice));

        assertThat(list).hasSize(2);
        assertThat(list.getFirst().invoiceId()).isNull();
        assertThat(list.get(1).invoiceNumber()).isEqualTo("FAC-2026-77777");
    }
}
