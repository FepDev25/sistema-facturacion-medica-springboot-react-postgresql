package com.fepdev.sfm.backend.domain.medicalrecord;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SeverityAndConverterTest {

    private final SeverityConverter converter = new SeverityConverter();

    @Test
    void severity_jsonMethods_handleNullAndValue() {
        assertThat(Severity.MODERATE.toValue()).isEqualTo("moderate");
        assertThat(Severity.fromJson("critical")).isEqualTo(Severity.CRITICAL);
        assertThat(Severity.fromJson(null)).isNull();
    }

    @Test
    void converter_mapsToAndFromDatabase() {
        assertThat(converter.convertToDatabaseColumn(Severity.SEVERE)).isEqualTo("severe");
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
        assertThat(converter.convertToEntityAttribute("mild")).isEqualTo(Severity.MILD);
        assertThat(converter.convertToEntityAttribute(null)).isNull();
    }
}
