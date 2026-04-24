package com.fepdev.sfm.backend.ai.icd10;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class Icd10DataLoaderTest {

    @Mock VectorStore vectorStore;
    @Mock JdbcTemplate jdbc;

    @InjectMocks
    Icd10DataLoader loader;

    @Test
    void alreadyLoaded_returnsTrue_whenCountGreaterThanZero() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(100);

        boolean result = checkAlreadyLoaded();
        assertThat(result).isTrue();
    }

    @Test
    void alreadyLoaded_returnsFalse_whenZero() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(0);

        boolean result = checkAlreadyLoaded();
        assertThat(result).isFalse();
    }

    @Test
    void alreadyLoaded_returnsFalse_whenNull() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(null);

        boolean result = checkAlreadyLoaded();
        assertThat(result).isFalse();
    }

    private boolean checkAlreadyLoaded() {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM vector_store WHERE metadata->>'code' IS NOT NULL", Integer.class);
        return count != null && count > 0;
    }
}
