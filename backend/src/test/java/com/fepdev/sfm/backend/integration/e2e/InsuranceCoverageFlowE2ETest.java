package com.fepdev.sfm.backend.integration.e2e;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fepdev.sfm.backend.domain.doctor.Doctor;
import com.fepdev.sfm.backend.domain.insurance.InsurancePolicy;
import com.fepdev.sfm.backend.domain.insurance.InsuranceProvider;
import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;
import com.fepdev.sfm.backend.domain.invoice.ItemType;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemRequest;
import com.fepdev.sfm.backend.domain.patient.Patient;
import com.fepdev.sfm.backend.domain.payment.PaymentMethod;
import com.fepdev.sfm.backend.domain.payment.dto.PaymentCreateRequest;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.jdbc.Sql;

@Sql(scripts = "/sql/cleanup_test_data.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class InsuranceCoverageFlowE2ETest extends AbstractPostgresFlowE2ETest {

    @Test
    void activePolicy_appliesCoverageAndReducesPatientResponsibility() {
        Patient patient = createPatient("flow3a");
        Doctor doctor = createDoctor("flow3a");
        var service = createServiceCatalog("flow3a", new BigDecimal("100.00"));

        InsuranceProvider provider = createInsuranceProvider("flow3a", true);
        InsurancePolicy activePolicy = createInsurancePolicy(
                patient,
                provider,
                true,
                LocalDate.now().minusDays(10),
                LocalDate.now().plusDays(20),
                new BigDecimal("80.00"),
                BigDecimal.ZERO,
                "flow3a");

        var completed = createAndCompleteAppointment(patient, doctor);
        var invoice = getInvoiceByAppointmentId(completed.id());
        invoice.setInsurancePolicy(activePolicy);
        invoiceRepository.save(invoice);

        invoiceService.addItem(
                invoice.getId(),
                new InvoiceItemRequest(
                        service.getId(),
                        null,
                        ItemType.SERVICE,
                        "Consulta cobertura activa",
                        1,
                        new BigDecimal("100.00")));

        var recalculated = getInvoice(invoice.getId());
        assertThat(recalculated.getInsuranceCoverage()).isGreaterThan(BigDecimal.ZERO);
        assertThat(recalculated.getPatientResponsibility()).isLessThan(recalculated.getTotal());
        assertThat(recalculated.getInsuranceCoverage().add(recalculated.getPatientResponsibility()))
                .isEqualByComparingTo(recalculated.getTotal());
    }

    @Test
    void expiredPolicy_setsZeroCoverageAndPatientPaysAll() {
        Patient patient = createPatient("flow3b");
        Doctor doctor = createDoctor("flow3b");
        var service = createServiceCatalog("flow3b", new BigDecimal("120.00"));

        InsuranceProvider provider = createInsuranceProvider("flow3b", true);
        InsurancePolicy expiredPolicy = createInsurancePolicy(
                patient,
                provider,
                true,
                LocalDate.now().minusDays(30),
                LocalDate.now().minusDays(1),
                new BigDecimal("90.00"),
                BigDecimal.ZERO,
                "flow3b");

        var completed = createAndCompleteAppointment(patient, doctor);
        var invoice = getInvoiceByAppointmentId(completed.id());
        invoice.setInsurancePolicy(expiredPolicy);
        invoiceRepository.save(invoice);

        invoiceService.addItem(
                invoice.getId(),
                new InvoiceItemRequest(
                        service.getId(),
                        null,
                        ItemType.SERVICE,
                        "Consulta poliza expirada",
                        1,
                        new BigDecimal("120.00")));

        var recalculated = getInvoice(invoice.getId());
        assertThat(recalculated.getInsuranceCoverage()).isEqualByComparingTo("0.00");
        assertThat(recalculated.getPatientResponsibility()).isEqualByComparingTo(recalculated.getTotal());
    }

    @Test
    void inactiveProvider_setsZeroCoverageAndPatientPaysAll() {
        Patient patient = createPatient("flow3c");
        Doctor doctor = createDoctor("flow3c");
        var service = createServiceCatalog("flow3c", new BigDecimal("140.00"));

        InsuranceProvider inactiveProvider = createInsuranceProvider("flow3c", false);
        InsurancePolicy policyWithInactiveProvider = createInsurancePolicy(
                patient,
                inactiveProvider,
                true,
                LocalDate.now().minusDays(2),
                LocalDate.now().plusDays(30),
                new BigDecimal("75.00"),
                BigDecimal.ZERO,
                "flow3c");

        var completed = createAndCompleteAppointment(patient, doctor);
        var invoice = getInvoiceByAppointmentId(completed.id());
        invoice.setInsurancePolicy(policyWithInactiveProvider);
        invoiceRepository.save(invoice);

        invoiceService.addItem(
                invoice.getId(),
                new InvoiceItemRequest(
                        service.getId(),
                        null,
                        ItemType.SERVICE,
                        "Consulta proveedor inactivo",
                        1,
                        new BigDecimal("140.00")));

        var recalculated = getInvoice(invoice.getId());
        assertThat(recalculated.getInsuranceCoverage()).isEqualByComparingTo("0.00");
        assertThat(recalculated.getPatientResponsibility()).isEqualByComparingTo(recalculated.getTotal());
    }

    @Test
    void policyCoverage_thenPatientPaysResponsibilityOnly_andInvoiceReachesPaid() {
        Patient patient = createPatient("flow3d");
        Doctor doctor = createDoctor("flow3d");
        var service = createServiceCatalog("flow3d", new BigDecimal("100.00"));

        InsuranceProvider provider = createInsuranceProvider("flow3d", true);
        InsurancePolicy policy = createInsurancePolicy(
                patient,
                provider,
                true,
                LocalDate.now().minusDays(5),
                LocalDate.now().plusDays(30),
                new BigDecimal("80.00"),
                BigDecimal.ZERO,
                "flow3d");

        var completed = createAndCompleteAppointment(patient, doctor);
        var invoice = getInvoiceByAppointmentId(completed.id());
        invoice.setInsurancePolicy(policy);
        invoiceRepository.save(invoice);

        invoiceService.addItem(
                invoice.getId(),
                new InvoiceItemRequest(
                        service.getId(),
                        null,
                        ItemType.SERVICE,
                        "Consulta con cobertura",
                        1,
                        new BigDecimal("100.00")));

        invoiceService.confirmInvoice(invoice.getId());

        var pending = getInvoice(invoice.getId());
        assertThat(pending.getStatus()).isEqualTo(InvoiceStatus.PENDING);
        assertThat(pending.getPatientResponsibility())
                .isEqualByComparingTo(pending.getTotal().multiply(new BigDecimal("0.20")));

        // la parte del seguro no se puede cobrar al paciente
        assertThatThrownBy(() -> paymentService.registerPayment(new PaymentCreateRequest(
                        invoice.getId(),
                        pending.getTotal(),
                        PaymentMethod.CASH,
                        null,
                        "Intento de cobrar la parte del seguro",
                        OffsetDateTime.now())))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("saldo pendiente");

        paymentService.registerPayment(new PaymentCreateRequest(
                invoice.getId(),
                pending.getPatientResponsibility(),
                PaymentMethod.CASH,
                null,
                "Pago de la responsabilidad del paciente",
                OffsetDateTime.now()));

        var paid = getInvoice(invoice.getId());
        assertThat(paid.getStatus()).isEqualTo(InvoiceStatus.PAID);
        assertThat(paymentRepository.sumAmountByInvoiceId(invoice.getId()))
                .isEqualByComparingTo(paid.getPatientResponsibility());
    }

    @Test
    void policyCoversEverything_invoiceIsPaidOnConfirmation() {
        Patient patient = createPatient("flow3e");
        Doctor doctor = createDoctor("flow3e");
        var service = createServiceCatalog("flow3e", new BigDecimal("100.00"));

        InsuranceProvider provider = createInsuranceProvider("flow3e", true);
        InsurancePolicy policy = createInsurancePolicy(
                patient,
                provider,
                true,
                LocalDate.now().minusDays(5),
                LocalDate.now().plusDays(30),
                new BigDecimal("100.00"),
                BigDecimal.ZERO,
                "flow3e");

        var completed = createAndCompleteAppointment(patient, doctor);
        var invoice = getInvoiceByAppointmentId(completed.id());
        invoice.setInsurancePolicy(policy);
        invoiceRepository.save(invoice);

        invoiceService.addItem(
                invoice.getId(),
                new InvoiceItemRequest(
                        service.getId(),
                        null,
                        ItemType.SERVICE,
                        "Consulta cubierta al 100 %",
                        1,
                        new BigDecimal("100.00")));

        invoiceService.confirmInvoice(invoice.getId());

        var confirmed = getInvoice(invoice.getId());
        assertThat(confirmed.getPatientResponsibility()).isEqualByComparingTo("0.00");
        assertThat(confirmed.getStatus()).isEqualTo(InvoiceStatus.PAID);
    }
}
