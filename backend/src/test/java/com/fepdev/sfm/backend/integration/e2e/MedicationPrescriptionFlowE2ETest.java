package com.fepdev.sfm.backend.integration.e2e;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import org.springframework.test.context.jdbc.Sql;

import com.fepdev.sfm.backend.domain.doctor.Doctor;
import com.fepdev.sfm.backend.domain.invoice.ItemType;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemRequest;
import com.fepdev.sfm.backend.domain.patient.Patient;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

@Sql(scripts = "/sql/cleanup_test_data.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class MedicationPrescriptionFlowE2ETest extends AbstractPostgresFlowE2ETest {

    @Test
    void medicationRequiresPrescription_withoutPrescription_rejectsInvoiceItem() {
        Patient patient = createPatient("flow4a");
        Doctor doctor = createDoctor("flow4a");
        var medication = createMedication("flow4a", new BigDecimal("25.00"), true);

        var completed = createAndCompleteAppointment(patient, doctor);
        var invoice = getInvoiceByAppointmentId(completed.id());

        assertThatThrownBy(() -> invoiceService.addItem(invoice.getId(), new InvoiceItemRequest(
                null,
                medication.getId(),
                ItemType.MEDICATION,
                "Medicamento con receta obligatoria",
                2,
                new BigDecimal("25.00"))))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("prescrip");
    }

    @Test
    void medicationRequiresPrescription_withPrescription_allowsInvoiceItem() {
        Patient patient = createPatient("flow4b");
        Doctor doctor = createDoctor("flow4b");
        var medication = createMedication("flow4b", new BigDecimal("30.00"), true);

        var completed = createAndCompleteAppointment(patient, doctor);
        var appointment = getAppointment(completed.id());
        var medicalRecord = getMedicalRecordByAppointmentId(completed.id());
        var invoice = getInvoiceByAppointmentId(completed.id());

        createPrescription(appointment, medicalRecord, medication, "flow4b");

        var itemResponse = invoiceService.addItem(invoice.getId(), new InvoiceItemRequest(
                null,
                medication.getId(),
                ItemType.MEDICATION,
                "Medicamento con receta valida",
                2,
                new BigDecimal("30.00")));

        assertThat(itemResponse.id()).isNotNull();
        assertThat(itemResponse.medicationId()).isEqualTo(medication.getId());

        var recalculated = getInvoice(invoice.getId());
        assertThat(recalculated.getSubtotal()).isEqualByComparingTo("60.00");
        assertThat(recalculated.getTotal()).isEqualByComparingTo("69.00");
    }
}
