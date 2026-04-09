package com.fepdev.sfm.backend.domain.invoice;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.domain.appointment.Appointment;
import com.fepdev.sfm.backend.domain.appointment.Status;
import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalog;
import com.fepdev.sfm.backend.domain.catalog.ServicesCatalog;
import com.fepdev.sfm.backend.domain.insurance.InsurancePolicy;
import com.fepdev.sfm.backend.domain.insurance.InsuranceProvider;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceListViewResponse;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceViewResponse;
import com.fepdev.sfm.backend.domain.patient.Patient;

class InvoiceViewMapperTest {

    private final InvoiceViewMapper mapper = new InvoiceViewMapper();

    @Test
    void toListView_mapsAllFields() {
        UUID invoiceId = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();
        LocalDate issueDate = LocalDate.now();
        LocalDate dueDate = issueDate.plusDays(30);
        OffsetDateTime createdAt = OffsetDateTime.now();

        Patient patient = new Patient();
        ReflectionTestUtils.setField(patient, "id", patientId);
        patient.setFirstName("Ana");
        patient.setLastName("Lopez");

        Invoice invoice = new Invoice();
        ReflectionTestUtils.setField(invoice, "id", invoiceId);
        invoice.setPatient(patient);
        invoice.setInvoiceNumber("FAC-2026-00001");
        invoice.setTotal(new BigDecimal("200.00"));
        invoice.setPatientResponsibility(new BigDecimal("200.00"));
        invoice.setStatus(InvoiceStatus.PENDING);
        invoice.setIssueDate(issueDate);
        invoice.setDueDate(dueDate);
        ReflectionTestUtils.setField(invoice, "createdAt", createdAt);

        InvoiceListViewResponse result = mapper.toListView(invoice);

        assertThat(result.id()).isEqualTo(invoiceId);
        assertThat(result.patientId()).isEqualTo(patientId);
        assertThat(result.patientFirstName()).isEqualTo("Ana");
        assertThat(result.patientLastName()).isEqualTo("Lopez");
        assertThat(result.invoiceNumber()).isEqualTo("FAC-2026-00001");
        assertThat(result.total()).isEqualByComparingTo("200.00");
        assertThat(result.patientResponsibility()).isEqualByComparingTo("200.00");
        assertThat(result.status()).isEqualTo(InvoiceStatus.PENDING);
        assertThat(result.issueDate()).isEqualTo(issueDate);
        assertThat(result.dueDate()).isEqualTo(dueDate);
        assertThat(result.createdAt()).isEqualTo(createdAt);
    }

    @Test
    void toView_withAllFields_mapsEverything() {
        UUID invoiceId = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();
        UUID appointmentId = UUID.randomUUID();
        UUID providerId = UUID.randomUUID();
        UUID policyId = UUID.randomUUID();
        UUID serviceId = UUID.randomUUID();
        UUID medicationId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        Patient patient = new Patient();
        ReflectionTestUtils.setField(patient, "id", patientId);
        patient.setDni("12345678");
        patient.setFirstName("Carlos");
        patient.setLastName("Gomez");
        patient.setAllergies("Polen");

        Appointment appointment = new Appointment();
        ReflectionTestUtils.setField(appointment, "id", appointmentId);
        appointment.setScheduledAt(OffsetDateTime.now().plusDays(1));
        appointment.setStatus(Status.SCHEDULED);
        appointment.setChiefComplaint("Dolor de cabeza");

        InsuranceProvider provider = new InsuranceProvider();
        ReflectionTestUtils.setField(provider, "id", providerId);
        provider.setName("Seguros XYZ");

        InsurancePolicy policy = new InsurancePolicy();
        ReflectionTestUtils.setField(policy, "id", policyId);
        policy.setPolicyNumber("POL-001");
        policy.setProvider(provider);
        policy.setCoveragePercentage(new BigDecimal("80.00"));

        ServicesCatalog service = new ServicesCatalog();
        ReflectionTestUtils.setField(service, "id", serviceId);
        service.setCode("S001");
        service.setName("Consulta general");
        service.setPrice(new BigDecimal("100.00"));

        MedicationsCatalog medication = new MedicationsCatalog();
        ReflectionTestUtils.setField(medication, "id", medicationId);
        medication.setCode("M001");
        medication.setName("Ibuprofeno");
        medication.setRequiresPrescription(true);

        InvoiceItem item = new InvoiceItem();
        ReflectionTestUtils.setField(item, "id", itemId);
        item.setService(service);
        item.setMedication(medication);
        item.setItemType(ItemType.SERVICE);
        item.setDescription("Consulta");
        item.setQuantity(1);
        item.setUnitPrice(new BigDecimal("100.00"));
        item.setSubtotal(new BigDecimal("100.00"));
        item.setCreatedAt(OffsetDateTime.now());

        Invoice invoice = new Invoice();
        ReflectionTestUtils.setField(invoice, "id", invoiceId);
        invoice.setInvoiceNumber("FAC-2026-00010");
        invoice.setPatient(patient);
        invoice.setAppointment(appointment);
        invoice.setInsurancePolicy(policy);
        invoice.setSubtotal(new BigDecimal("100.00"));
        invoice.setTax(new BigDecimal("15.00"));
        invoice.setTotal(new BigDecimal("115.00"));
        invoice.setInsuranceCoverage(new BigDecimal("92.00"));
        invoice.setPatientResponsibility(new BigDecimal("23.00"));
        invoice.setStatus(InvoiceStatus.PENDING);
        invoice.setIssueDate(LocalDate.now());
        invoice.setDueDate(LocalDate.now().plusDays(30));
        invoice.setNotes("Nota especial");
        ReflectionTestUtils.setField(invoice, "createdAt", OffsetDateTime.now());
        ReflectionTestUtils.setField(invoice, "updatedAt", OffsetDateTime.now());

        InvoiceViewResponse result = mapper.toView(invoice, List.of(item));

        assertThat(result.id()).isEqualTo(invoiceId);
        assertThat(result.invoiceNumber()).isEqualTo("FAC-2026-00010");

        assertThat(result.patient().id()).isEqualTo(patientId);
        assertThat(result.patient().dni()).isEqualTo("12345678");
        assertThat(result.patient().firstName()).isEqualTo("Carlos");
        assertThat(result.patient().lastName()).isEqualTo("Gomez");
        assertThat(result.patient().allergies()).isEqualTo("Polen");

        assertThat(result.appointment().id()).isEqualTo(appointmentId);
        assertThat(result.appointment().status()).isEqualTo(Status.SCHEDULED);
        assertThat(result.appointment().chiefComplaint()).isEqualTo("Dolor de cabeza");

        assertThat(result.insurancePolicy().id()).isEqualTo(policyId);
        assertThat(result.insurancePolicy().policyNumber()).isEqualTo("POL-001");
        assertThat(result.insurancePolicy().providerName()).isEqualTo("Seguros XYZ");
        assertThat(result.insurancePolicy().coveragePercentage()).isEqualByComparingTo("80.00");

        assertThat(result.subtotal()).isEqualByComparingTo("100.00");
        assertThat(result.tax()).isEqualByComparingTo("15.00");
        assertThat(result.total()).isEqualByComparingTo("115.00");
        assertThat(result.notes()).isEqualTo("Nota especial");
        assertThat(result.items()).hasSize(1);

        InvoiceViewResponse.InvoiceItemView itemView = result.items().getFirst();
        assertThat(itemView.id()).isEqualTo(itemId);
        assertThat(itemView.service().id()).isEqualTo(serviceId);
        assertThat(itemView.service().code()).isEqualTo("S001");
        assertThat(itemView.service().name()).isEqualTo("Consulta general");
        assertThat(itemView.service().price()).isEqualByComparingTo("100.00");
        assertThat(itemView.medication().id()).isEqualTo(medicationId);
        assertThat(itemView.medication().code()).isEqualTo("M001");
        assertThat(itemView.medication().name()).isEqualTo("Ibuprofeno");
        assertThat(itemView.medication().requiresPrescription()).isTrue();
    }

    @Test
    void toView_withNullAppointment_mapsAppointmentAsNull() {
        UUID invoiceId = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();

        Patient patient = new Patient();
        ReflectionTestUtils.setField(patient, "id", patientId);
        patient.setFirstName("Ana");
        patient.setLastName("Lopez");

        Invoice invoice = new Invoice();
        ReflectionTestUtils.setField(invoice, "id", invoiceId);
        invoice.setPatient(patient);
        invoice.setAppointment(null);
        invoice.setInvoiceNumber("FAC-2026-00002");
        invoice.setStatus(InvoiceStatus.DRAFT);
        invoice.setIssueDate(LocalDate.now());
        invoice.setDueDate(LocalDate.now().plusDays(30));

        InvoiceViewResponse result = mapper.toView(invoice, List.of());

        assertThat(result.appointment()).isNull();
        assertThat(result.patient().firstName()).isEqualTo("Ana");
    }

    @Test
    void toView_withNullPolicy_mapsPolicyAsNull() {
        UUID invoiceId = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();

        Patient patient = new Patient();
        ReflectionTestUtils.setField(patient, "id", patientId);
        patient.setFirstName("Luis");
        patient.setLastName("Perez");

        Invoice invoice = new Invoice();
        ReflectionTestUtils.setField(invoice, "id", invoiceId);
        invoice.setPatient(patient);
        invoice.setInsurancePolicy(null);
        invoice.setInvoiceNumber("FAC-2026-00003");
        invoice.setStatus(InvoiceStatus.DRAFT);
        invoice.setIssueDate(LocalDate.now());
        invoice.setDueDate(LocalDate.now().plusDays(30));

        InvoiceViewResponse result = mapper.toView(invoice, List.of());

        assertThat(result.insurancePolicy()).isNull();
    }

    @Test
    void toView_withNullServiceAndMedication_mapsBothAsNull() {
        UUID invoiceId = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        Patient patient = new Patient();
        ReflectionTestUtils.setField(patient, "id", patientId);

        InvoiceItem item = new InvoiceItem();
        ReflectionTestUtils.setField(item, "id", itemId);
        item.setItemType(ItemType.OTHER);
        item.setDescription("Insumo");
        item.setQuantity(2);
        item.setUnitPrice(new BigDecimal("5.00"));
        item.setSubtotal(new BigDecimal("10.00"));
        item.setService(null);
        item.setMedication(null);

        Invoice invoice = new Invoice();
        ReflectionTestUtils.setField(invoice, "id", invoiceId);
        invoice.setPatient(patient);
        invoice.setAppointment(null);
        invoice.setInsurancePolicy(null);
        invoice.setInvoiceNumber("FAC-2026-00004");
        invoice.setStatus(InvoiceStatus.DRAFT);
        invoice.setIssueDate(LocalDate.now());
        invoice.setDueDate(LocalDate.now().plusDays(30));

        InvoiceViewResponse result = mapper.toView(invoice, List.of(item));

        InvoiceViewResponse.InvoiceItemView itemView = result.items().getFirst();
        assertThat(itemView.service()).isNull();
        assertThat(itemView.medication()).isNull();
        assertThat(itemView.itemType()).isEqualTo(ItemType.OTHER);
    }
}
