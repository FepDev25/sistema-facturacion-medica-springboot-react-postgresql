package com.fepdev.sfm.backend.integration.e2e;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.test.context.jdbc.Sql;

import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentCreateRequest;
import com.fepdev.sfm.backend.domain.doctor.Doctor;
import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;
import com.fepdev.sfm.backend.domain.invoice.ItemType;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemRequest;
import com.fepdev.sfm.backend.domain.patient.Patient;
import com.fepdev.sfm.backend.domain.payment.PaymentMethod;
import com.fepdev.sfm.backend.domain.payment.dto.PaymentCreateRequest;

@Sql(scripts = "/sql/cleanup_test_data.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class DashboardFlowE2ETest extends AbstractPostgresFlowE2ETest {

    @Test
    void dashboard_countsOnlyCobrableStatesAndRealBalances() {
        Patient patient = createPatient("dash");
        Doctor doctor = createDoctor("dash");
        var service = createServiceCatalog("dash", new BigDecimal("100.00"));

        OffsetDateTime now = OffsetDateTime.now(clock);
        OffsetDateTime todayEarly = now.withHour(0).withMinute(1).withSecond(0).withNano(0);
        OffsetDateTime tomorrowMorning = now.plusDays(1)
                .withHour(9).withMinute(0).withSecond(0).withNano(0);

        appointmentService.createAppointment(new AppointmentCreateRequest(
                patient.getId(), doctor.getId(), todayEarly, 30, "Control del día", null));
        appointmentService.createAppointment(new AppointmentCreateRequest(
                patient.getId(), doctor.getId(), tomorrowMorning, 30, "Control de mañana", null));

        // Factura parcialmente pagada: total 100 + 15 % IVA = 115, abono 40.
        var firstCompleted = createAndCompleteAppointment(patient, doctor, now.plusDays(2)
                .withHour(10).withMinute(0).withSecond(0).withNano(0));
        var firstInvoice = getInvoiceByAppointmentId(firstCompleted.id());
        invoiceService.addItem(firstInvoice.getId(), new InvoiceItemRequest(
                service.getId(), null, ItemType.SERVICE, "Consulta", 1, new BigDecimal("100.00")));
        invoiceService.confirmInvoice(firstInvoice.getId());
        paymentService.registerPayment(new PaymentCreateRequest(
                firstInvoice.getId(), new BigDecimal("40.00"), PaymentMethod.CASH,
                null, "Abono", OffsetDateTime.now()));

        // Factura vencida sin pagos: total 115.
        var secondCompleted = createAndCompleteAppointment(patient, doctor, now.plusDays(3)
                .withHour(10).withMinute(0).withSecond(0).withNano(0));
        var secondInvoice = getInvoiceByAppointmentId(secondCompleted.id());
        invoiceService.addItem(secondInvoice.getId(), new InvoiceItemRequest(
                service.getId(), null, ItemType.SERVICE, "Consulta", 1, new BigDecimal("100.00")));
        invoiceService.confirmInvoice(secondInvoice.getId());
        invoiceService.markOverdue(secondInvoice.getId());

        assertThat(getInvoice(firstInvoice.getId()).getStatus()).isEqualTo(InvoiceStatus.PARTIAL_PAID);
        assertThat(getInvoice(secondInvoice.getId()).getStatus()).isEqualTo(InvoiceStatus.OVERDUE);

        var metrics = dashboardService.getMetrics();

        assertThat(metrics.totalPatients()).isEqualTo(1);
        assertThat(metrics.activeDoctors()).isEqualTo(1);
        assertThat(metrics.appointmentsToday()).isEqualTo(1);
        // la cita de hoy a las 00:01 puede seguir en el futuro si el test corre de madrugada
        long expectedUpcoming = 1 + (todayEarly.isAfter(now) ? 1 : 0);
        assertThat(metrics.upcomingAppointments()).isEqualTo(expectedUpcoming);
        assertThat(metrics.pendingInvoices()).isEqualTo(1);
        assertThat(metrics.overdueInvoices()).isEqualTo(1);
        assertThat(metrics.totalCollected()).isEqualByComparingTo("40.00");
        assertThat(metrics.pendingCollection()).isEqualByComparingTo("190.00");
    }
}
