package com.fepdev.sfm.backend.domain.medicalrecord;

import jakarta.persistence.Converter;
import jakarta.persistence.AttributeConverter;

@Converter(autoApply = true)
public class SeverityConverter implements AttributeConverter<Severity, String> {

    @Override
    public String convertToDatabaseColumn(Severity severity) {
        return severity == null ? null : severity.name().toLowerCase();
    }

    @Override
    public Severity convertToEntityAttribute(String dbData) {
        return dbData == null ? null : Severity.valueOf(dbData.toUpperCase());
    }
    
}
