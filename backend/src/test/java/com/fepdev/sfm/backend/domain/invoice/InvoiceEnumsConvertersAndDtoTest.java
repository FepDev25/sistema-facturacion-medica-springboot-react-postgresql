package com.fepdev.sfm.backend.domain.invoice;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceCreateRequest;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemRequest;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceStatusUpdateRequest;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceSummaryResponse;

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
}
