package com.fepdev.sfm.backend.domain.catalog;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class UnitConverter implements AttributeConverter<Unit, String> {

    @Override
    public String convertToDatabaseColumn(Unit unit) {
        return unit == null ? null : unit.name().toLowerCase();
    }

    @Override
    public Unit convertToEntityAttribute(String dbData) {
        return dbData == null ? null : Unit.valueOf(dbData.toUpperCase());
    }
}
