package com.fepdev.sfm.backend.integration.e2e;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.test.context.jdbc.Sql;

import com.fepdev.sfm.backend.domain.doctor.Doctor;
import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;
import com.fepdev.sfm.backend.domain.invoice.ItemType;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemRequest;
import com.fepdev.sfm.backend.domain.patient.Patient;
import com.fepdev.sfm.backend.domain.payment.PaymentMethod;
import com.fepdev.sfm.backend.domain.payment.dto.PaymentCreateRequest;

@Sql(scripts = "/sql/cleanup_test_data.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class InvoiceLifecyclePaymentFlowE2ETest extends AbstractPostgresFlowE2ETest {

    @Test
    void addItems_confirmInvoice_andRegisterPartialAndTotalPayments() {
        Patient patient = createPatient("flow2");
        Doctor doctor = createDoctor("flow2");
        var service = createServiceCatalog("flow2", new BigDecimal("100.00"));

        var completed = createAndCompleteAppointment(patient, doctor);
        var invoice = getInvoiceByAppointmentId(completed.id());

        invoiceService.addItem(invoice.getId(), new InvoiceItemRequest(
                service.getId(),
                null,
                ItemType.SERVICE,
                "Consulta general",
                2,
                new BigDecimal("100.00")));

        var afterItem = getInvoice(invoice.getId());
        assertThat(afterItem.getStatus()).isEqualTo(InvoiceStatus.DRAFT);
        assertThat(afterItem.getSubtotal()).isEqualByComparingTo("200.00");
        assertThat(afterItem.getTax()).isEqualByComparingTo("30.00");
        assertThat(afterItem.getTotal()).isEqualByComparingTo("230.00");

        invoiceService.confirmInvoice(invoice.getId());
        var pending = getInvoice(invoice.getId());
        assertThat(pending.getStatus()).isEqualTo(InvoiceStatus.PENDING);

        paymentService.registerPayment(new PaymentCreateRequest(
                invoice.getId(),
                new BigDecimal("100.00"),
                PaymentMethod.CASH,
                null,
                "Pago parcial",
                OffsetDateTime.now()));

        var partialPaid = getInvoice(invoice.getId());
        assertThat(partialPaid.getStatus()).isEqualTo(InvoiceStatus.PARTIAL_PAID);

        paymentService.registerPayment(new PaymentCreateRequest(
                invoice.getId(),
                new BigDecimal("130.00"),
                PaymentMethod.CASH,
                null,
                "Pago total",
                OffsetDateTime.now()));

        var paid = getInvoice(invoice.getId());
        assertThat(paid.getStatus()).isEqualTo(InvoiceStatus.PAID);
        assertThat(paymentRepository.sumAmountByInvoiceId(invoice.getId())).isEqualByComparingTo("230.00");
    }
}
