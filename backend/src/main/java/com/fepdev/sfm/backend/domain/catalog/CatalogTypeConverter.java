package com.fepdev.sfm.backend.domain.catalog;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class CatalogTypeConverter implements AttributeConverter<CatalogType, String> {

    @Override
    public String convertToDatabaseColumn(CatalogType attribute) {
        return attribute == null ? null : attribute.name().toLowerCase();
    }

    @Override
    public CatalogType convertToEntityAttribute(String dbData) {
        return dbData == null ? null : CatalogType.valueOf(dbData.toUpperCase());
    }
}
