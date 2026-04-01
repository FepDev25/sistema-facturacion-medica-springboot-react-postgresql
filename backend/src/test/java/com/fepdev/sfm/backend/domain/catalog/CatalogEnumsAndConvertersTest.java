package com.fepdev.sfm.backend.domain.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CatalogEnumsAndConvertersTest {

    private final CatalogTypeConverter catalogTypeConverter = new CatalogTypeConverter();
    private final CategoryConverter categoryConverter = new CategoryConverter();
    private final UnitConverter unitConverter = new UnitConverter();

    @Test
    void catalogType_jsonAndConverter_coverBranches() {
        assertThat(CatalogType.SERVICE.toValue()).isEqualTo("service");
        assertThat(CatalogType.fromJson("medication")).isEqualTo(CatalogType.MEDICATION);
        assertThat(CatalogType.fromJson(null)).isNull();

        assertThat(catalogTypeConverter.convertToDatabaseColumn(CatalogType.MEDICATION)).isEqualTo("medication");
        assertThat(catalogTypeConverter.convertToDatabaseColumn(null)).isNull();
        assertThat(catalogTypeConverter.convertToEntityAttribute("service")).isEqualTo(CatalogType.SERVICE);
        assertThat(catalogTypeConverter.convertToEntityAttribute(null)).isNull();
    }

    @Test
    void category_jsonAndConverter_coverBranches() {
        assertThat(Category.EMERGENCY.toValue()).isEqualTo("emergency");
        assertThat(Category.fromJson("laboratory")).isEqualTo(Category.LABORATORY);
        assertThat(Category.fromJson(null)).isNull();

        assertThat(categoryConverter.convertToDatabaseColumn(Category.SURGERY)).isEqualTo("surgery");
        assertThat(categoryConverter.convertToDatabaseColumn(null)).isNull();
        assertThat(categoryConverter.convertToEntityAttribute("therapy")).isEqualTo(Category.THERAPY);
        assertThat(categoryConverter.convertToEntityAttribute(null)).isNull();
    }

    @Test
    void unit_jsonAndConverter_coverBranches() {
        assertThat(Unit.BOX.toValue()).isEqualTo("box");
        assertThat(Unit.fromJson("tablet")).isEqualTo(Unit.TABLET);
        assertThat(Unit.fromJson(null)).isNull();

        assertThat(unitConverter.convertToDatabaseColumn(Unit.INHALER)).isEqualTo("inhaler");
        assertThat(unitConverter.convertToDatabaseColumn(null)).isNull();
        assertThat(unitConverter.convertToEntityAttribute("vial")).isEqualTo(Unit.VIAL);
        assertThat(unitConverter.convertToEntityAttribute(null)).isNull();
    }
}
