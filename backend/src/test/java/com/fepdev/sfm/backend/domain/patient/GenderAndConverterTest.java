package com.fepdev.sfm.backend.domain.patient;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class GenderAndConverterTest {

    private final GenderConverter converter = new GenderConverter();

    @Test
    void gender_jsonAndConverter_coverBranches() {
        assertThat(Gender.PREFER_NOT_TO_SAY.toValue()).isEqualTo("prefer_not_to_say");
        assertThat(Gender.fromJson("male")).isEqualTo(Gender.MALE);
        assertThat(Gender.fromJson(null)).isNull();

        assertThat(converter.convertToDatabaseColumn(Gender.FEMALE)).isEqualTo("female");
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
        assertThat(converter.convertToEntityAttribute("other")).isEqualTo(Gender.OTHER);
        assertThat(converter.convertToEntityAttribute(null)).isNull();
    }
}
