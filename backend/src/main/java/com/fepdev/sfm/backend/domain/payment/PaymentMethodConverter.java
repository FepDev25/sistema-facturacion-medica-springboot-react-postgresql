package com.fepdev.sfm.backend.domain.payment;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class PaymentMethodConverter implements AttributeConverter<PaymentMethod, String> {

    @Override
    public String convertToDatabaseColumn(PaymentMethod paymentMethod) {
        return paymentMethod == null ? null : paymentMethod.name().toLowerCase();
    }

    @Override
    public PaymentMethod convertToEntityAttribute(String dbData) {
        return dbData == null ? null : PaymentMethod.valueOf(dbData.toUpperCase());
    }
    
}
