package com.fepdev.sfm.backend.domain.invoice;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ItemTypeConverter implements AttributeConverter<ItemType, String> {

    @Override
    public String convertToDatabaseColumn(ItemType itemType) {
        return itemType == null ? null : itemType.name().toLowerCase();
    }

    @Override
    public ItemType convertToEntityAttribute(String dbData) {
        return dbData == null ? null : ItemType.valueOf(dbData.toUpperCase());
    }
    
}
