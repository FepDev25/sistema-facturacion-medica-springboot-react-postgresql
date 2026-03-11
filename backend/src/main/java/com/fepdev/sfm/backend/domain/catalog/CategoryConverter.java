package com.fepdev.sfm.backend.domain.catalog;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class CategoryConverter implements AttributeConverter<Category, String> {

    @Override
    public String convertToDatabaseColumn(Category category) {
        return category == null ? null : category.name().toLowerCase();
    }

    @Override
    public Category convertToEntityAttribute(String dbData) {
        return dbData == null ? null : Category.valueOf(dbData.toUpperCase());
    }

}
