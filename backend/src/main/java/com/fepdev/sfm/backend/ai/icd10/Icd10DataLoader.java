package com.fepdev.sfm.backend.ai.icd10;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.opencsv.CSVReader;

@Component
public class Icd10DataLoader {

    private static final Logger log = LoggerFactory.getLogger(Icd10DataLoader.class);
    private static final int BATCH_SIZE = 50;
    private static final String CSV_PATH = "data/cie-10.csv";

    private final VectorStore vectorStore;
    private final JdbcTemplate jdbc;

    public Icd10DataLoader(VectorStore vectorStore, JdbcTemplate jdbc) {
        this.vectorStore = vectorStore;
        this.jdbc = jdbc;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void loadOnStartup() {
        CompletableFuture.runAsync(() -> {
            try {
                if (alreadyLoaded()) {
                    log.info("CIE-10 ya indexado en el vector store — omitiendo carga.");
                    return;
                }
                log.info("Iniciando indexación de CIE-10...");
                long start = System.currentTimeMillis();
                int total = loadCsv();
                long elapsed = (System.currentTimeMillis() - start) / 1000;
                log.info("CIE-10 indexado: {} códigos en {}s.", total, elapsed);
            } catch (Exception e) {
                log.error("Error indexando CIE-10", e);
            }
        });
    }

    private boolean alreadyLoaded() {
        // filtra por presencia del campo 'code' en metadata para no confundir
        // registros de historial de pacientes (que tienen 'patientId') con ICD-10
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM vector_store WHERE metadata->>'code' IS NOT NULL", Integer.class);
        return count != null && count > 0;
    }

    private int loadCsv() throws Exception {
        ClassPathResource resource = new ClassPathResource(CSV_PATH);
        List<Document> batch = new ArrayList<>();
        int total = 0;

        try (CSVReader reader = new CSVReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {

            reader.readNext(); // skip header

            String[] row;
            while ((row = reader.readNext()) != null) {
                String level = row[7].trim();
                if (!level.equals("2") && !level.equals("3")
                        && !level.equals("4") && !level.equals("5")) {
                    continue;
                }

                String rawCode = row[0].trim();
                if (rawCode.isEmpty() || rawCode.contains("-")) continue;

                String code = formatCode(rawCode);
                String description = row[6].trim();
                if (description.isEmpty()) continue;

                batch.add(new Document(description, Map.of("code", code)));

                if (batch.size() >= BATCH_SIZE) {
                    vectorStore.add(batch);
                    total += batch.size();
                    batch.clear();
                    log.debug("CIE-10: {} códigos indexados...", total);
                }
            }
        }

        if (!batch.isEmpty()) {
            vectorStore.add(batch);
            total += batch.size();
        }

        return total;
    }

    private static String formatCode(String raw) {
        if (raw.length() <= 3) return raw;
        return raw.substring(0, 3) + "." + raw.substring(3);
    }
}
