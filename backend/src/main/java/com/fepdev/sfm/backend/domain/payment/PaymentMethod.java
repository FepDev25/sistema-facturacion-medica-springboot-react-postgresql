package com.fepdev.sfm.backend.domain.payment;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum PaymentMethod {
    CASH,
    CREDIT_CARD,
    DEBIT_CARD,
    BANK_TRANSFER,
    CHECK,
    INSURANCE,
    OTHER;

    @JsonValue
    public String toValue() {
        return this.name().toLowerCase();
    }

    @JsonCreator
    public static PaymentMethod fromJson(String value) {
        return value == null ? null : PaymentMethod.valueOf(value.toUpperCase());
    }
}
