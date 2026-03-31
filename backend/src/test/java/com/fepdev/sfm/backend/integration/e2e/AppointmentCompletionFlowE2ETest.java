package com.fepdev.sfm.backend.integration.e2e;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.springframework.test.context.jdbc.Sql;

import com.fepdev.sfm.backend.domain.appointment.Status;
import com.fepdev.sfm.backend.domain.doctor.Doctor;
import com.fepdev.sfm.backend.domain.invoice.Invoice;
import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecord;
import com.fepdev.sfm.backend.domain.patient.Patient;

@Sql(scripts = "/sql/cleanup_test_data.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class AppointmentCompletionFlowE2ETest extends AbstractPostgresFlowE2ETest {

    private static final Pattern INVOICE_NUMBER_PATTERN = Pattern.compile("FAC-\\d{4}-\\d{5}");

    @Test
    void completeAppointment_createsMedicalRecordAndDraftInvoice() {
        Patient patient = createPatient("flow1");
        Doctor doctor = createDoctor("flow1");

        var completed = createAndCompleteAppointment(patient, doctor);

        assertThat(completed.status()).isEqualTo(Status.COMPLETED);

        MedicalRecord medicalRecord = getMedicalRecordByAppointmentId(completed.id());
        assertThat(medicalRecord.getPatient().getId()).isEqualTo(patient.getId());
        assertThat(medicalRecord.getAppointment().getId()).isEqualTo(completed.id());

        Invoice invoice = getInvoiceByAppointmentId(completed.id());
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.DRAFT);
        assertThat(invoice.getPatient().getId()).isEqualTo(patient.getId());
        assertThat(invoice.getAppointment().getId()).isEqualTo(completed.id());
        assertThat(invoice.getSubtotal()).isEqualByComparingTo(BigDecimal.ZERO.setScale(2));
        assertThat(invoice.getTax()).isEqualByComparingTo(BigDecimal.ZERO.setScale(2));
        assertThat(invoice.getTotal()).isEqualByComparingTo(BigDecimal.ZERO.setScale(2));
        assertThat(invoice.getInsuranceCoverage()).isEqualByComparingTo(BigDecimal.ZERO.setScale(2));
        assertThat(invoice.getPatientResponsibility()).isEqualByComparingTo(BigDecimal.ZERO.setScale(2));
        assertThat(INVOICE_NUMBER_PATTERN.matcher(invoice.getInvoiceNumber()).matches()).isTrue();
    }
}
