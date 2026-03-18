package com.fepdev.sfm.backend.domain.invoice;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum InvoiceStatus {
    // 'draft', 'pending', 'partial_paid', 'paid', 'cancelled', 'overdue'
    DRAFT,
    PENDING,
    PARTIAL_PAID,
    PAID,
    CANCELLED,
    OVERDUE;

    @JsonValue
    public String toValue() {
        return this.name().toLowerCase();
    }

    @JsonCreator
    public static InvoiceStatus fromJson(String value) {
        return value == null ? null : InvoiceStatus.valueOf(value.toUpperCase());
    }
}
