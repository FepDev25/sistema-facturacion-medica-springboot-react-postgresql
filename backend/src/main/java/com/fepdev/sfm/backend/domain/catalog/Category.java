package com.fepdev.sfm.backend.domain.catalog;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Category {
    CONSULTATION,
    LABORATORY,
    IMAGING,
    SURGERY,
    THERAPY,
    EMERGENCY,
    OTHER;

    @JsonValue
    public String toValue() {
        return this.name().toLowerCase();
    }

    @JsonCreator
    public static Category fromJson(String value) {
        return value == null ? null : Category.valueOf(value.toUpperCase());
    }
}
