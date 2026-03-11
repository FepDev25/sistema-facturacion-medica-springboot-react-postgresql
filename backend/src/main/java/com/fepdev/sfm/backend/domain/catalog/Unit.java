package com.fepdev.sfm.backend.domain.catalog;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Unit {
    TABLET,
    CAPSULE,
    ML,
    MG,
    G,
    UNIT,
    BOX,
    VIAL,
    INHALER;

    @JsonValue
    public String toValue() {
        return this.name().toLowerCase();
    }

    @JsonCreator
    public static Unit fromJson(String value) {
        return value == null ? null : Unit.valueOf(value.toUpperCase());
    }
}
