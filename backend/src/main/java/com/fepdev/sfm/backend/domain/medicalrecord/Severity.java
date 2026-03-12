package com.fepdev.sfm.backend.domain.medicalrecord;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Severity {
    MILD,
    MODERATE,
    SEVERE,
    CRITICAL;

    @JsonValue
    public String toValue() {
        return this.name().toLowerCase();
    }

    @JsonCreator
    public static Severity fromJson(String value) {
        return value == null ? null : Severity.valueOf(value.toUpperCase());
    }

}
