package com.fepdev.sfm.backend.domain.appointment;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class StatusConverter implements AttributeConverter<Status, String> {
    
    @Override
    public String convertToDatabaseColumn(Status status) {
        return status == null ? null : status.name();
    }

    @Override
    public Status convertToEntityAttribute(String dbData) {
        return dbData == null ? null : Status.valueOf(dbData);
    }
}
