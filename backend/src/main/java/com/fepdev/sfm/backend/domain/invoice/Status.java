package com.fepdev.sfm.backend.domain.invoice;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Status {
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
    public static Status fromJson(String value) {
        return value == null ? null : Status.valueOf(value.toUpperCase());
    }
}
