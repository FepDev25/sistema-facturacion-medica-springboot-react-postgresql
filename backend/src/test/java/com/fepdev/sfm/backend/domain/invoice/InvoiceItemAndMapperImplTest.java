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
import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalog;
import com.fepdev.sfm.backend.domain.catalog.ServicesCatalog;
import com.fepdev.sfm.backend.domain.insurance.InsurancePolicy;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemRequest;
import com.fepdev.sfm.backend.domain.patient.Patient;

class InvoiceItemAndMapperImplTest {

    private final InvoiceItemMapper invoiceItemMapper = new InvoiceItemMapperImpl();
    private final InvoiceMapper invoiceMapper = new InvoiceMapperImpl();

    @Test
    void invoiceItem_getTotalPrice_multipliesUnitPriceByQuantity() {
        InvoiceItem item = new InvoiceItem();
        item.setUnitPrice(new BigDecimal("12.50"));
        item.setQuantity(3);

        assertThat(item.getTotalPrice()).isEqualByComparingTo("37.50");
    }

    @Test
    void invoiceItemMapper_toEntity_and_toResponse_mapFields() {
        UUID invoiceId = UUID.randomUUID();
        UUID serviceId = UUID.randomUUID();
        UUID medicationId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        InvoiceItemRequest request = new InvoiceItemRequest(
                serviceId,
                medicationId,
                ItemType.SERVICE,
                "Consulta",
                2,
                new BigDecimal("50.00"));

        InvoiceItem mappedEntity = invoiceItemMapper.toEntity(request);
        assertThat(mappedEntity.getItemType()).isEqualTo(ItemType.SERVICE);
        assertThat(mappedEntity.getDescription()).isEqualTo("Consulta");
        assertThat(mappedEntity.getQuantity()).isEqualTo(2);
        assertThat(mappedEntity.getUnitPrice()).isEqualByComparingTo("50.00");
        assertThat(mappedEntity.getInvoice()).isNull();
        assertThat(mappedEntity.getService()).isNull();
        assertThat(mappedEntity.getMedication()).isNull();

        Invoice invoice = new Invoice();
        ReflectionTestUtils.setField(invoice, "id", invoiceId);
        ServicesCatalog service = new ServicesCatalog();
        ReflectionTestUtils.setField(service, "id", serviceId);
        service.setName("Consulta general");
        MedicationsCatalog medication = new MedicationsCatalog();
        ReflectionTestUtils.setField(medication, "id", medicationId);
        medication.setName("Amoxicilina");

        InvoiceItem entity = new InvoiceItem();
        ReflectionTestUtils.setField(entity, "id", itemId);
        entity.setInvoice(invoice);
        entity.setService(service);
        entity.setMedication(medication);
        entity.setItemType(ItemType.MEDICATION);
        entity.setDescription("Medicamento");
        entity.setQuantity(1);
        entity.setUnitPrice(new BigDecimal("20.00"));
        entity.setSubtotal(new BigDecimal("20.00"));
        entity.setCreatedAt(OffsetDateTime.now());

        var response = invoiceItemMapper.toResponse(entity);
        var list = invoiceItemMapper.toResponseList(List.of(entity));

        assertThat(response.id()).isEqualTo(itemId);
        assertThat(response.invoiceId()).isEqualTo(invoiceId);
        assertThat(response.serviceId()).isEqualTo(serviceId);
        assertThat(response.serviceName()).isEqualTo("Consulta general");
        assertThat(response.medicationId()).isEqualTo(medicationId);
        assertThat(response.medicationName()).isEqualTo("Amoxicilina");
        assertThat(list).hasSize(1);
        assertThat(list.getFirst().id()).isEqualTo(itemId);
    }

    @Test
    void invoiceMapper_toResponse_and_summary_mapsNestedFields() {
        UUID invoiceId = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();
        UUID appointmentId = UUID.randomUUID();
        UUID policyId = UUID.randomUUID();

        Patient patient = new Patient();
        ReflectionTestUtils.setField(patient, "id", patientId);
        patient.setFirstName("Ana");
        patient.setLastName("Lopez");
        Appointment appointment = new Appointment();
        ReflectionTestUtils.setField(appointment, "id", appointmentId);
        InsurancePolicy policy = new InsurancePolicy();
        ReflectionTestUtils.setField(policy, "id", policyId);

        Invoice invoice = new Invoice();
        ReflectionTestUtils.setField(invoice, "id", invoiceId);
        invoice.setPatient(patient);
        invoice.setAppointment(appointment);
        invoice.setInsurancePolicy(policy);
        invoice.setInvoiceNumber("FAC-2026-01000");
        invoice.setSubtotal(new BigDecimal("100.00"));
        invoice.setTax(new BigDecimal("15.00"));
        invoice.setTotal(new BigDecimal("115.00"));
        invoice.setInsuranceCoverage(BigDecimal.ZERO);
        invoice.setPatientResponsibility(new BigDecimal("115.00"));
        invoice.setStatus(InvoiceStatus.PENDING);
        invoice.setIssueDate(LocalDate.now());
        invoice.setDueDate(LocalDate.now().plusDays(30));

        var response = invoiceMapper.toResponse(invoice);
        var summary = invoiceMapper.toSummaryResponse(invoice);
        var summaries = invoiceMapper.toSummaryResponseList(List.of(invoice));

        assertThat(response.id()).isEqualTo(invoiceId);
        assertThat(response.patientId()).isEqualTo(patientId);
        assertThat(response.appointmentId()).isEqualTo(appointmentId);
        assertThat(response.insurancePolicyId()).isEqualTo(policyId);
        assertThat(summary.patientFirstName()).isEqualTo("Ana");
        assertThat(summaries).hasSize(1);
        assertThat(summaries.getFirst().invoiceNumber()).isEqualTo("FAC-2026-01000");
    }
}
