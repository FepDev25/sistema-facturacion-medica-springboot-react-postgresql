package com.fepdev.sfm.backend.domain.invoice;


import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class InvoiceStatusConverter implements AttributeConverter<InvoiceStatus, String> {

    @Override
    public String convertToDatabaseColumn(InvoiceStatus status) {
        return status == null ? null : status.name().toLowerCase();
    }

    @Override
    public InvoiceStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : InvoiceStatus.valueOf(dbData.toUpperCase());
    }
    
}
