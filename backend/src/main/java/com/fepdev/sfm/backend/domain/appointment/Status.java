package com.fepdev.sfm.backend.domain.appointment;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Status {
    SCHEDULED, 
    CONFIRMED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED, 
    NO_SHOW;

    @JsonValue
    public String toValue() {
        return this.name().toLowerCase();
    }

    @JsonCreator
    public static Status fromJson(String value) {
        return value == null ? null : Status.valueOf(value.toUpperCase());
    }
}
