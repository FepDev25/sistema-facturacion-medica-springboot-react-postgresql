package com.fepdev.sfm.backend.ai.history;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.fepdev.sfm.backend.domain.medicalrecord.Diagnosis;
import com.fepdev.sfm.backend.domain.medicalrecord.DiagnosisRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecord;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecordRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.Prescription;
import com.fepdev.sfm.backend.domain.medicalrecord.PrescriptionRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.Procedure;
import com.fepdev.sfm.backend.domain.medicalrecord.ProcedureRepository;

@Component
public class PatientHistoryIndexer {

    private static final Logger log = LoggerFactory.getLogger(PatientHistoryIndexer.class);

    private final VectorStore vectorStore;
    private final JdbcTemplate jdbc;
    private final MedicalRecordRepository medicalRecordRepository;
    private final DiagnosisRepository diagnosisRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final ProcedureRepository procedureRepository;

    public PatientHistoryIndexer(VectorStore vectorStore, JdbcTemplate jdbc,
            MedicalRecordRepository medicalRecordRepository,
            DiagnosisRepository diagnosisRepository,
            PrescriptionRepository prescriptionRepository,
            ProcedureRepository procedureRepository) {
        this.vectorStore = vectorStore;
        this.jdbc = jdbc;
        this.medicalRecordRepository = medicalRecordRepository;
        this.diagnosisRepository = diagnosisRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.procedureRepository = procedureRepository;
    }

    public boolean isPatientIndexed(UUID patientId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM vector_store WHERE metadata->>'patientId' = ?",
                Integer.class, patientId.toString());
        return count != null && count > 0;
    }

    // topK dinámico: escala con el número de expedientes indexados para no perder
    // registros relevantes en historiales amplios, con techo de 15 para evitar ruido.
    public int resolveTopK(UUID patientId) {
        Integer indexed = jdbc.queryForObject(
                "SELECT COUNT(*) FROM vector_store WHERE metadata->>'patientId' = ?",
                Integer.class, patientId.toString());
        if (indexed == null || indexed <= 8) return 6;
        if (indexed <= 15) return 10;
        return 15;
    }

    // Construye un contexto estructurado con el historial completo del paciente desde BD.
    // Se usa cuando la query es de resumen — garantiza cobertura total independientemente de topK.
    public String buildSummaryContext(UUID patientId) {
        List<MedicalRecord> records = medicalRecordRepository.findByPatientIdEager(patientId);
        if (records.isEmpty()) return "";

        List<Diagnosis> allDiagnoses = diagnosisRepository.findAllByPatientId(patientId);
        List<Prescription> allPrescriptions = prescriptionRepository.findAllByPatientIdEager(patientId);
        List<Procedure> allProcedures = procedureRepository.findAllByPatientId(patientId);

        StringBuilder sb = new StringBuilder();
        sb.append("Historial clínico completo del paciente (")
          .append(records.size()).append(" expedientes):\n\n");

        // Diagnósticos deduplicados por código ICD-10, con conteo de recurrencias
        if (!allDiagnoses.isEmpty()) {
            Map<String, long[]> byCode = new LinkedHashMap<>();
            for (Diagnosis d : allDiagnoses) {
                byCode.computeIfAbsent(d.getIcd10Code() + "|" + d.getDescription(),
                        k -> new long[]{0})[0]++;
            }
            sb.append("## Diagnósticos registrados (").append(byCode.size()).append(" únicos):\n");
            byCode.forEach((key, count) -> {
                String[] parts = key.split("\\|", 2);
                sb.append("- ").append(parts[0]).append(": ").append(parts[1]);
                if (count[0] > 1) sb.append(" (").append(count[0]).append(" consultas)");
                sb.append("\n");
            });
            sb.append("\n");
        }

        // Medicamentos deduplicados por nombre, con conteo de prescripciones
        if (!allPrescriptions.isEmpty()) {
            Map<String, long[]> byName = new LinkedHashMap<>();
            for (Prescription p : allPrescriptions) {
                byName.computeIfAbsent(p.getMedication().getName(), k -> new long[]{0})[0]++;
            }
            sb.append("## Medicamentos prescritos (").append(byName.size()).append(" únicos):\n");
            byName.forEach((name, count) -> {
                sb.append("- ").append(name);
                if (count[0] > 1) sb.append(" (").append(count[0]).append(" prescripciones)");
                sb.append("\n");
            });
            sb.append("\n");
        }

        // Procedimientos (sin deduplicar — cada realización es relevante)
        if (!allProcedures.isEmpty()) {
            // Deduplicar por descripción para no listar duplicados del seed
            List<String> seen = new ArrayList<>();
            sb.append("## Procedimientos realizados:\n");
            for (Procedure p : allProcedures) {
                if (!seen.contains(p.getDescription())) {
                    seen.add(p.getDescription());
                    sb.append("- ").append(p.getDescription()).append("\n");
                }
            }
            sb.append("\n");
        }

        // Período del historial
        sb.append("Período del historial: ")
          .append(records.get(records.size() - 1).getRecordDate().toLocalDate())
          .append(" — ")
          .append(records.get(0).getRecordDate().toLocalDate());

        return sb.toString();
    }

    // Indexa todos los expedientes de un paciente. Cada repositorio abre su propia transacción
    // corta; findByPatientIdEager y findAllByMedicalRecordIdEager hacen JOIN FETCH de las
    // asociaciones lazy para evitar LazyInitializationException fuera de sesión.
    public void indexPatient(UUID patientId) {
        List<MedicalRecord> records = medicalRecordRepository.findByPatientIdEager(patientId);
        if (records.isEmpty()) {
            log.info("Paciente {} no tiene expedientes para indexar", patientId);
            return;
        }
        List<Document> docs = records.stream().map(this::buildDocument).toList();
        vectorStore.add(docs);
        log.info("Paciente {}: {} expediente(s) indexado(s)", patientId, docs.size());
    }

    // Elimina el documento existente del expediente y lo re-indexa con el estado actual de la BD.
    // Llamado de forma asíncrona después de que la transacción del servicio hace commit.
    public void reindexRecord(UUID medicalRecordId) {
        jdbc.update("DELETE FROM vector_store WHERE metadata->>'medicalRecordId' = ?",
                medicalRecordId.toString());

        MedicalRecord record = medicalRecordRepository.findByIdWithPatient(medicalRecordId).orElse(null);
        if (record == null) {
            log.warn("Re-indexación: expediente {} no encontrado — probablemente eliminado", medicalRecordId);
            return;
        }
        vectorStore.add(List.of(buildDocument(record)));
        log.debug("Expediente {} re-indexado (paciente {})", medicalRecordId, record.getPatient().getId());
    }

    // Registra un re-índice asíncrono post-commit. Llamado desde servicios de dominio cuando
    // se agrega o modifica contenido clínico asociado a un expediente.
    public void scheduleReindex(UUID medicalRecordId) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                CompletableFuture.runAsync(() -> {
                    try {
                        reindexRecord(medicalRecordId);
                    } catch (Exception e) {
                        log.error("Error re-indexando expediente {}", medicalRecordId, e);
                    }
                });
            }
        });
    }

    private Document buildDocument(MedicalRecord record) {
        List<Diagnosis> diagnoses = diagnosisRepository.findByMedicalRecordId(record.getId());
        List<Prescription> prescriptions = prescriptionRepository.findAllByMedicalRecordIdEager(record.getId());
        List<Procedure> procedures = procedureRepository.findAllByMedicalRecordId(record.getId());

        String text = buildDocumentText(record, diagnoses, prescriptions, procedures);
        Map<String, Object> metadata = Map.of(
                "patientId", record.getPatient().getId().toString(),
                "medicalRecordId", record.getId().toString(),
                "recordDate", record.getRecordDate().toLocalDate().toString());
        return new Document(text, metadata);
    }

    private String buildDocumentText(MedicalRecord record, List<Diagnosis> diagnoses,
            List<Prescription> prescriptions, List<Procedure> procedures) {
        StringBuilder sb = new StringBuilder();
        sb.append("Fecha: ").append(record.getRecordDate().toLocalDate()).append("\n");
        sb.append("Notas clínicas: ").append(record.getClinicalNotes()).append("\n");

        if (record.getPhysicalExam() != null && !record.getPhysicalExam().isBlank()) {
            sb.append("Examen físico: ").append(record.getPhysicalExam()).append("\n");
        }

        if (!diagnoses.isEmpty()) {
            sb.append("Diagnósticos:");
            for (Diagnosis d : diagnoses) {
                sb.append("\n- ").append(d.getIcd10Code()).append(": ").append(d.getDescription());
                if (d.getSeverity() != null) {
                    sb.append(" [").append(d.getSeverity()).append("]");
                }
            }
            sb.append("\n");
        }

        if (!prescriptions.isEmpty()) {
            sb.append("Prescripciones:");
            for (Prescription p : prescriptions) {
                sb.append("\n- ").append(p.getMedication().getName())
                  .append(" — ").append(p.getDosage())
                  .append(", ").append(p.getFrequency())
                  .append(", ").append(p.getDurationDays()).append(" días");
                if (p.getInstructions() != null && !p.getInstructions().isBlank()) {
                    sb.append(" (").append(p.getInstructions()).append(")");
                }
            }
            sb.append("\n");
        }

        if (!procedures.isEmpty()) {
            sb.append("Procedimientos:");
            for (Procedure pr : procedures) {
                sb.append("\n- ").append(pr.getProcedureCode()).append(": ").append(pr.getDescription());
            }
            sb.append("\n");
        }

        return sb.toString();
    }
}
