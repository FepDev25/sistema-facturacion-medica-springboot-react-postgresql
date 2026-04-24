package com.fepdev.sfm.backend.ai.extraction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.fepdev.sfm.backend.ai.extraction.dto.ExtractedDiagnosis;
import com.fepdev.sfm.backend.ai.extraction.dto.ExtractedProcedure;

class ExtractionToolsTest {

    private ExtractionTools tools;

    @BeforeEach
    void setUp() {
        tools = new ExtractionTools();
    }

    @Test
    void initially_empty_lists() {
        assertThat(tools.getDiagnoses()).isEmpty();
        assertThat(tools.getRawPrescriptions()).isEmpty();
        assertThat(tools.getProcedures()).isEmpty();
    }

    @Test
    void addDiagnosis_adds_to_list() {
        tools.addDiagnosis("J02.9", "Faringitis aguda", "mild");
        tools.addDiagnosis("I10", "Hipertension esencial", "moderate");

        var result = tools.getDiagnoses();
        assertThat(result).hasSize(2);
        assertThat(result.getFirst().icd10Code()).isEqualTo("J02.9");
        assertThat(result.getFirst().description()).isEqualTo("Faringitis aguda");
        assertThat(result.getFirst().severity()).isEqualTo("mild");
        assertThat(result.get(1).icd10Code()).isEqualTo("I10");
    }

    @Test
    void addPrescription_adds_to_list() {
        tools.addPrescription("Amoxicilina", "500mg", "cada 8h", 5, "tomar con alimentos");
        tools.addPrescription("Ibuprofeno", "400mg", "cada 12h", 3, null);

        var result = tools.getRawPrescriptions();
        assertThat(result).hasSize(2);
        assertThat(result.getFirst().medicationName()).isEqualTo("Amoxicilina");
        assertThat(result.getFirst().dosage()).isEqualTo("500mg");
        assertThat(result.getFirst().frequency()).isEqualTo("cada 8h");
        assertThat(result.getFirst().durationDays()).isEqualTo(5);
        assertThat(result.getFirst().instructions()).isEqualTo("tomar con alimentos");
        assertThat(result.get(1).instructions()).isNull();
    }

    @Test
    void addProcedure_adds_to_list() {
        tools.addProcedure("PROC-1", "Sutura simple", "herida superficial");

        var result = tools.getProcedures();
        assertThat(result).hasSize(1);
        assertThat(result.getFirst().procedureCode()).isEqualTo("PROC-1");
        assertThat(result.getFirst().description()).isEqualTo("Sutura simple");
        assertThat(result.getFirst().notes()).isEqualTo("herida superficial");
    }

    @Test
    void getters_return_unmodifiable_copies() {
        tools.addDiagnosis("I10", "HTA", "moderate");

        var copy = tools.getDiagnoses();
        assertThatThrownBy(() -> copy.add(new ExtractedDiagnosis("X", "Y", "Z")))
                .isInstanceOf(UnsupportedOperationException.class);
    }
}
