package com.fepdev.sfm.backend.ai.icd10;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

class Icd10DataLoaderTest {

    private final VectorStore vectorStore = mock(VectorStore.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final Icd10DataLoader loader = new Icd10DataLoader(vectorStore, jdbc);

    @Test
    void alreadyLoaded_returnsTrue_whenCountReachesExpected() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(14_208);
        assertThat(invokeAlreadyLoaded()).isTrue();
    }

    @Test
    void alreadyLoaded_returnsFalse_whenPartialLoad() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(10_750);
        assertThat(invokeAlreadyLoaded()).isFalse();
    }

    @Test
    void alreadyLoaded_returnsFalse_whenZeroOrNull() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(0, (Integer) null);
        assertThat(invokeAlreadyLoaded()).isFalse();
        assertThat(invokeAlreadyLoaded()).isFalse();
    }

    @Test
    void formatCode_addsDotAfterTheFirstThreeCharacters() {
        assertThat(formatCode("I10")).isEqualTo("I10");
        assertThat(formatCode("E119")).isEqualTo("E11.9");
        assertThat(formatCode("M5450")).isEqualTo("M54.50");
    }

    @Test
    @SuppressWarnings("unchecked")
    void loadCsv_filtersLevelsEmptyDescriptionsAndAlreadyIndexedCodes() throws Exception {
        when(jdbc.queryForList(anyString(), eq(String.class))).thenReturn(List.of("I10"));

        int indexed = loader.loadCsv(new ClassPathResource("ai-evals/cie10-test.csv"));

        assertThat(indexed).isEqualTo(2);
        ArgumentCaptor<List<Document>> captor = ArgumentCaptor.forClass(List.class);
        verify(vectorStore).add(captor.capture());
        assertThat(captor.getValue()).extracting(doc -> doc.getMetadata().get("code"))
                .containsExactly("A09", "E11.9");
        assertThat(captor.getValue().get(1).getText())
                .isEqualTo("Diabetes tipo 2 sin complicaciones");
    }

    @Test
    void loadCsv_whenEverythingIsAlreadyIndexed_doesNotAddDocuments() throws Exception {
        when(jdbc.queryForList(anyString(), eq(String.class)))
                .thenReturn(List.of("A09", "E11.9", "I10"));

        int indexed = loader.loadCsv(new ClassPathResource("ai-evals/cie10-test.csv"));

        assertThat(indexed).isZero();
        verify(vectorStore, org.mockito.Mockito.never()).add(org.mockito.ArgumentMatchers.anyList());
    }

    private boolean invokeAlreadyLoaded() {
        return Boolean.TRUE.equals(ReflectionTestUtils.invokeMethod(loader, "alreadyLoaded"));
    }

    private String formatCode(String raw) {
        return Icd10DataLoader.formatCode(raw);
    }
}
