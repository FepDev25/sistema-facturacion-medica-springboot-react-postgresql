package com.fepdev.sfm.backend.domain.invoice.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.fepdev.sfm.backend.domain.appointment.Status;
import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;
import com.fepdev.sfm.backend.domain.invoice.ItemType;

public record InvoiceViewResponse(
    UUID id,
    String invoiceNumber,
    PatientView patient,
    AppointmentView appointment,
    InsurancePolicyView insurancePolicy,
    BigDecimal subtotal,
    BigDecimal tax,
    BigDecimal total,
    BigDecimal insuranceCoverage,
    BigDecimal patientResponsibility,
    InvoiceStatus status,
    LocalDate issueDate,
    LocalDate dueDate,
    String notes,
    List<InvoiceItemView> items,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
    public record PatientView(
        UUID id,
        String dni,
        String firstName,
        String lastName,
        String allergies
    ) {}

    public record AppointmentView(
        UUID id,
        OffsetDateTime scheduledAt,
        Status status,
        String chiefComplaint
    ) {}

    public record InsurancePolicyView(
        UUID id,
        String policyNumber,
        String providerName,
        BigDecimal coveragePercentage
    ) {}

    public record ServiceView(
        UUID id,
        String code,
        String name,
        BigDecimal price
    ) {}

    public record MedicationView(
        UUID id,
        String code,
        String name,
        boolean requiresPrescription
    ) {}

    public record InvoiceItemView(
        UUID id,
        ServiceView service,
        MedicationView medication,
        ItemType itemType,
        String description,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal subtotal,
        OffsetDateTime createdAt
    ) {}
}
