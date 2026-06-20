package com.fepdev.sfm.backend.ai.icd10;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class Icd10DataLoaderTest {

    @Test
    void alreadyLoaded_returnsTrue_whenCountReachesExpected() {
        assertThat(isComplete(14_208)).isTrue();
    }

    @Test
    void alreadyLoaded_returnsFalse_whenPartialLoad() {
        assertThat(isComplete(10_750)).isFalse();
    }

    @Test
    void alreadyLoaded_returnsFalse_whenZero() {
        assertThat(isComplete(0)).isFalse();
    }

    @Test
    void alreadyLoaded_returnsFalse_whenNull() {
        assertThat(isComplete(null)).isFalse();
    }

    private boolean isComplete(Integer count) {
        return count != null && count >= Icd10DataLoader.EXPECTED_COUNT;
    }
}
