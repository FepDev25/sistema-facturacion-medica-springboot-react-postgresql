package com.fepdev.sfm.backend.domain.invoice;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceCreateRequest;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceInsurancePolicyRequest;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemRequest;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemResponse;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceListViewResponse;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceResponse;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceStatusUpdateRequest;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceSummaryResponse;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceViewResponse;

class InvoiceEnumsConvertersAndDtoTest {

    private final ItemTypeConverter itemTypeConverter = new ItemTypeConverter();
    private final InvoiceStatusConverter invoiceStatusConverter = new InvoiceStatusConverter();

    @Test
    void itemType_jsonAndConverter_coverBranches() {
        assertThat(ItemType.PROCEDURE.toValue()).isEqualTo("procedure");
        assertThat(ItemType.fromJson("service")).isEqualTo(ItemType.SERVICE);
        assertThat(ItemType.fromJson(null)).isNull();

        assertThat(itemTypeConverter.convertToDatabaseColumn(ItemType.MEDICATION)).isEqualTo("medication");
        assertThat(itemTypeConverter.convertToDatabaseColumn(null)).isNull();
        assertThat(itemTypeConverter.convertToEntityAttribute("other")).isEqualTo(ItemType.OTHER);
        assertThat(itemTypeConverter.convertToEntityAttribute(null)).isNull();
    }

    @Test
    void invoiceStatus_jsonAndConverter_coverBranches() {
        assertThat(InvoiceStatus.PARTIAL_PAID.toValue()).isEqualTo("partial_paid");
        assertThat(InvoiceStatus.fromJson("overdue")).isEqualTo(InvoiceStatus.OVERDUE);
        assertThat(InvoiceStatus.fromJson(null)).isNull();

        assertThat(invoiceStatusConverter.convertToDatabaseColumn(InvoiceStatus.PAID)).isEqualTo("paid");
        assertThat(invoiceStatusConverter.convertToDatabaseColumn(null)).isNull();
        assertThat(invoiceStatusConverter.convertToEntityAttribute("draft")).isEqualTo(InvoiceStatus.DRAFT);
        assertThat(invoiceStatusConverter.convertToEntityAttribute(null)).isNull();
    }

    @Test
    void invoiceDto_records_accessors_work() {
        UUID patientId = UUID.randomUUID();
        UUID appointmentId = UUID.randomUUID();
        UUID policyId = UUID.randomUUID();
        InvoiceItemRequest item = new InvoiceItemRequest(
                UUID.randomUUID(),
                null,
                ItemType.SERVICE,
                "Consulta",
                1,
                new java.math.BigDecimal("50.00"));
        InvoiceCreateRequest create = new InvoiceCreateRequest(patientId, appointmentId, policyId, List.of(item), "nota");
        InvoiceStatusUpdateRequest statusUpdate = new InvoiceStatusUpdateRequest(InvoiceStatus.CANCELLED);
        InvoiceSummaryResponse summary = new InvoiceSummaryResponse(
                UUID.randomUUID(),
                "FAC-2026-00001",
                patientId,
                "Ana",
                "Lopez",
                new java.math.BigDecimal("50.00"),
                InvoiceStatus.PENDING,
                java.time.LocalDate.now(),
                java.time.LocalDate.now().plusDays(30));

        assertThat(create.patientId()).isEqualTo(patientId);
        assertThat(create.items()).hasSize(1);
        assertThat(statusUpdate.status()).isEqualTo(InvoiceStatus.CANCELLED);
        assertThat(summary.invoiceNumber()).isEqualTo("FAC-2026-00001");
    }

    @Test
    void invoiceResponse_record_accessors_work() {
        UUID id = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();
        InvoiceResponse response = new InvoiceResponse(
                id, patientId, "Ana", "Lopez", null, null, "FAC-2026-00001",
                new java.math.BigDecimal("100.00"), new java.math.BigDecimal("15.00"),
                new java.math.BigDecimal("115.00"), new java.math.BigDecimal("0.00"),
                new java.math.BigDecimal("115.00"), InvoiceStatus.PENDING,
                java.time.LocalDate.now(), java.time.LocalDate.now().plusDays(30),
                "nota", List.of(), null, null);

        assertThat(response.id()).isEqualTo(id);
        assertThat(response.patientId()).isEqualTo(patientId);
        assertThat(response.patientFirstName()).isEqualTo("Ana");
        assertThat(response.patientLastName()).isEqualTo("Lopez");
        assertThat(response.invoiceNumber()).isEqualTo("FAC-2026-00001");
        assertThat(response.subtotal()).isEqualByComparingTo("100.00");
        assertThat(response.tax()).isEqualByComparingTo("15.00");
        assertThat(response.total()).isEqualByComparingTo("115.00");
        assertThat(response.insuranceCoverage()).isEqualByComparingTo("0.00");
        assertThat(response.patientResponsibility()).isEqualByComparingTo("115.00");
        assertThat(response.status()).isEqualTo(InvoiceStatus.PENDING);
        assertThat(response.notes()).isEqualTo("nota");
        assertThat(response.items()).isEmpty();
        assertThat(response.appointmentId()).isNull();
        assertThat(response.insurancePolicyId()).isNull();
        assertThat(response.createdAt()).isNull();
        assertThat(response.updatedAt()).isNull();
    }

    @Test
    void invoiceItemResponse_record_accessors_work() {
        UUID id = UUID.randomUUID();
        UUID invoiceId = UUID.randomUUID();
        InvoiceItemResponse item = new InvoiceItemResponse(
                id, invoiceId, null, "Consulta", null, null,
                ItemType.SERVICE, "Consulta", 1,
                new java.math.BigDecimal("50.00"), new java.math.BigDecimal("50.00"), null);

        assertThat(item.id()).isEqualTo(id);
        assertThat(item.invoiceId()).isEqualTo(invoiceId);
        assertThat(item.serviceId()).isNull();
        assertThat(item.serviceName()).isEqualTo("Consulta");
        assertThat(item.medicationId()).isNull();
        assertThat(item.medicationName()).isNull();
        assertThat(item.itemType()).isEqualTo(ItemType.SERVICE);
        assertThat(item.description()).isEqualTo("Consulta");
        assertThat(item.quantity()).isEqualTo(1);
        assertThat(item.unitPrice()).isEqualByComparingTo("50.00");
        assertThat(item.subtotal()).isEqualByComparingTo("50.00");
        assertThat(item.createdAt()).isNull();
    }

    @Test
    void invoiceListViewResponse_record_accessors_work() {
        UUID id = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();
        InvoiceListViewResponse lvi = new InvoiceListViewResponse(
                id, patientId, "Ana", "Lopez", "FAC-2026-00001",
                new java.math.BigDecimal("100.00"), new java.math.BigDecimal("100.00"),
                InvoiceStatus.PENDING, java.time.LocalDate.now(),
                java.time.LocalDate.now().plusDays(30), null);

        assertThat(lvi.id()).isEqualTo(id);
        assertThat(lvi.patientId()).isEqualTo(patientId);
        assertThat(lvi.patientFirstName()).isEqualTo("Ana");
        assertThat(lvi.patientLastName()).isEqualTo("Lopez");
        assertThat(lvi.invoiceNumber()).isEqualTo("FAC-2026-00001");
        assertThat(lvi.total()).isEqualByComparingTo("100.00");
        assertThat(lvi.patientResponsibility()).isEqualByComparingTo("100.00");
        assertThat(lvi.status()).isEqualTo(InvoiceStatus.PENDING);
        assertThat(lvi.createdAt()).isNull();
    }

    @Test
    void invoiceInsurancePolicyRequest_record_accessors_work() {
        UUID policyId = UUID.randomUUID();
        InvoiceInsurancePolicyRequest req = new InvoiceInsurancePolicyRequest(policyId);
        assertThat(req.insurancePolicyId()).isEqualTo(policyId);
    }

    @Test
    void invoiceViewResponse_andNestedRecords_accessors_work() {
        UUID id = UUID.randomUUID();
        InvoiceViewResponse.PatientView patient = new InvoiceViewResponse.PatientView(
                UUID.randomUUID(), "12345678", "Ana", "Lopez", "Polen");
        InvoiceViewResponse.AppointmentView appointment = new InvoiceViewResponse.AppointmentView(
                UUID.randomUUID(), java.time.OffsetDateTime.now(),
                com.fepdev.sfm.backend.domain.appointment.Status.SCHEDULED, "Dolor");
        InvoiceViewResponse.InsurancePolicyView policy = new InvoiceViewResponse.InsurancePolicyView(
                UUID.randomUUID(), "POL-001", "Seguros XYZ", new java.math.BigDecimal("80.00"));
        InvoiceViewResponse.ServiceView service = new InvoiceViewResponse.ServiceView(
                UUID.randomUUID(), "S001", "Consulta", new java.math.BigDecimal("100.00"));
        InvoiceViewResponse.MedicationView med = new InvoiceViewResponse.MedicationView(
                UUID.randomUUID(), "M001", "Ibuprofeno", true);
        InvoiceViewResponse.InvoiceItemView itemView = new InvoiceViewResponse.InvoiceItemView(
                UUID.randomUUID(), service, med, ItemType.SERVICE, "Consulta",
                1, new java.math.BigDecimal("100.00"), new java.math.BigDecimal("100.00"), null);

        assertThat(patient.id()).isNotNull();
        assertThat(patient.dni()).isEqualTo("12345678");
        assertThat(patient.firstName()).isEqualTo("Ana");
        assertThat(patient.lastName()).isEqualTo("Lopez");
        assertThat(patient.allergies()).isEqualTo("Polen");

        assertThat(appointment.id()).isNotNull();
        assertThat(appointment.status()).isEqualTo(com.fepdev.sfm.backend.domain.appointment.Status.SCHEDULED);
        assertThat(appointment.chiefComplaint()).isEqualTo("Dolor");

        assertThat(policy.policyNumber()).isEqualTo("POL-001");
        assertThat(policy.providerName()).isEqualTo("Seguros XYZ");
        assertThat(policy.coveragePercentage()).isEqualByComparingTo("80.00");

        assertThat(service.code()).isEqualTo("S001");
        assertThat(service.name()).isEqualTo("Consulta");
        assertThat(med.requiresPrescription()).isTrue();
        assertThat(itemView.itemType()).isEqualTo(ItemType.SERVICE);

        InvoiceViewResponse view = new InvoiceViewResponse(
                id, "FAC-2026-00001", patient, appointment, policy,
                new java.math.BigDecimal("100.00"), new java.math.BigDecimal("15.00"),
                new java.math.BigDecimal("115.00"), new java.math.BigDecimal("0.00"),
                new java.math.BigDecimal("115.00"), InvoiceStatus.PENDING,
                java.time.LocalDate.now(), java.time.LocalDate.now().plusDays(30),
                "nota", List.of(itemView), null, null);

        assertThat(view.id()).isEqualTo(id);
        assertThat(view.invoiceNumber()).isEqualTo("FAC-2026-00001");
        assertThat(view.patient()).isEqualTo(patient);
        assertThat(view.items()).hasSize(1);
    }

    @Test
    void invoiceSequence_gettersAndSetters_work() {
        InvoiceSequence seq = new InvoiceSequence();
        seq.setYear(2026);
        seq.setLastSequence(42);

        assertThat(seq.getYear()).isEqualTo(2026);
        assertThat(seq.getLastSequence()).isEqualTo(42);
    }
}
