package com.fepdev.sfm.backend.domain.invoice;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ItemType {
    // 'service', 'medication', 'procedure', 'other'
    SERVICE,
    MEDICATION,
    PROCEDURE,
    OTHER;

    @JsonValue
    public String toValue() {
        return this.name().toLowerCase();
    }

    @JsonCreator
    public static ItemType fromJson(String value) {
        return value == null ? null : ItemType.valueOf(value.toUpperCase());
    }
}
