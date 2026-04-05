package com.fepdev.sfm.backend.integration.e2e;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.test.context.jdbc.Sql;

import com.fepdev.sfm.backend.domain.appointment.Status;
import com.fepdev.sfm.backend.domain.doctor.Doctor;
import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;
import com.fepdev.sfm.backend.domain.invoice.ItemType;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemRequest;
import com.fepdev.sfm.backend.domain.patient.Patient;
import com.fepdev.sfm.backend.domain.payment.PaymentMethod;
import com.fepdev.sfm.backend.domain.payment.dto.PaymentCreateRequest;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

@Sql(scripts = "/sql/cleanup_test_data.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class CancellationRulesFlowE2ETest extends AbstractPostgresFlowE2ETest {

    @Test
    void appointmentCancellation_allowsScheduled_butRejectsInProgress() {
        Patient patient = createPatient("cancel1");
        Doctor doctor = createDoctor("cancel1");

        var scheduled = createScheduledAppointment(patient, doctor);
        var cancelled = appointmentService.cancelAppointment(scheduled.id());
        assertThat(cancelled.status()).isEqualTo(Status.CANCELLED);

        var another = createScheduledAppointment(patient, doctor);
        appointmentService.confirmAppointment(another.id());
        appointmentService.startAppointment(another.id());

        assertThatThrownBy(() -> appointmentService.cancelAppointment(another.id()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("SCHEDULED o CONFIRMED");
    }

    @Test
    void appointmentNoShow_allowsScheduledAndConfirmed_butRejectsInProgress() {
        Patient patient = createPatient("noshow1");
        Doctor doctor = createDoctor("noshow1");

        var scheduled = createScheduledAppointment(patient, doctor);
        var noShowFromScheduled = appointmentService.markNoShow(scheduled.id());
        assertThat(noShowFromScheduled.status()).isEqualTo(Status.NO_SHOW);

        var confirmed = createScheduledAppointment(patient, doctor);
        appointmentService.confirmAppointment(confirmed.id());
        var noShowFromConfirmed = appointmentService.markNoShow(confirmed.id());
        assertThat(noShowFromConfirmed.status()).isEqualTo(Status.NO_SHOW);

        var inProgress = createScheduledAppointment(patient, doctor);
        appointmentService.confirmAppointment(inProgress.id());
        appointmentService.startAppointment(inProgress.id());

        assertThatThrownBy(() -> appointmentService.markNoShow(inProgress.id()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("SCHEDULED o CONFIRMED");
    }

    @Test
    void invoiceCancellation_rejectsWhenInvoiceHasPayments() {
        Patient patient = createPatient("cancel2");
        Doctor doctor = createDoctor("cancel2");
        var service = createServiceCatalog("cancel2", new BigDecimal("80.00"));

        var completed = createAndCompleteAppointment(patient, doctor);
        var invoice = getInvoiceByAppointmentId(completed.id());

        invoiceService.addItem(invoice.getId(), new InvoiceItemRequest(
                service.getId(),
                null,
                ItemType.SERVICE,
                "Servicio para cancelacion",
                1,
                new BigDecimal("80.00")));
        invoiceService.confirmInvoice(invoice.getId());

        paymentService.registerPayment(new PaymentCreateRequest(
                invoice.getId(),
                new BigDecimal("20.00"),
                PaymentMethod.CASH,
                null,
                "anticipo",
                OffsetDateTime.now()));

        assertThat(getInvoice(invoice.getId()).getStatus()).isEqualTo(InvoiceStatus.PARTIAL_PAID);

        assertThatThrownBy(() -> invoiceService.cancelInvoice(invoice.getId()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("DRAFT o PENDING");
    }
}
