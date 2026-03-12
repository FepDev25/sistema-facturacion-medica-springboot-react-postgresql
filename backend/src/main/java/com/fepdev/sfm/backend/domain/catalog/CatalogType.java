package com.fepdev.sfm.backend.domain.catalog;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum CatalogType {
    SERVICE,
    MEDICATION;

    @JsonValue
    public String toValue() {
        return this.name().toLowerCase();
    }

    @JsonCreator
    public static CatalogType fromJson(String value) {
        return value == null ? null : CatalogType.valueOf(value.toUpperCase());
    }
}
