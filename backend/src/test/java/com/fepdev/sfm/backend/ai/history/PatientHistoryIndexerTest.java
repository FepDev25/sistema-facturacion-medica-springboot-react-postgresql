package com.fepdev.sfm.backend.ai.history;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fepdev.sfm.backend.domain.medicalrecord.Diagnosis;
import com.fepdev.sfm.backend.domain.medicalrecord.DiagnosisRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecord;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecordRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.Prescription;
import com.fepdev.sfm.backend.domain.medicalrecord.PrescriptionRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.Procedure;
import com.fepdev.sfm.backend.domain.medicalrecord.ProcedureRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.Severity;
import com.fepdev.sfm.backend.domain.patient.Patient;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class PatientHistoryIndexerTest {

    @Mock
    VectorStore vectorStore;

    @Mock
    JdbcTemplate jdbc;

    @Mock
    MedicalRecordRepository medicalRecordRepository;

    @Mock
    DiagnosisRepository diagnosisRepository;

    @Mock
    PrescriptionRepository prescriptionRepository;

    @Mock
    ProcedureRepository procedureRepository;

    @InjectMocks
    PatientHistoryIndexer indexer;

    @Test
    void isPatientIndexed_returnsTrue_whenCountGreaterThanZero() {
        UUID patientId = UUID.randomUUID();
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString())).thenReturn(5);

        assertThat(indexer.isPatientIndexed(patientId)).isTrue();
    }

    @Test
    void isPatientIndexed_returnsFalse_whenCountIsZero() {
        UUID patientId = UUID.randomUUID();
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString())).thenReturn(0);

        assertThat(indexer.isPatientIndexed(patientId)).isFalse();
    }

    @Test
    void isPatientIndexed_returnsFalse_whenNull() {
        UUID patientId = UUID.randomUUID();
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString())).thenReturn(null);

        assertThat(indexer.isPatientIndexed(patientId)).isFalse();
    }

    @Test
    void resolveTopK_returns6_whenIndexed8orLess() {
        UUID patientId = UUID.randomUUID();
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString())).thenReturn(8);

        assertThat(indexer.resolveTopK(patientId)).isEqualTo(6);
    }

    @Test
    void resolveTopK_returns6_whenIndexed5() {
        UUID patientId = UUID.randomUUID();
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString())).thenReturn(5);

        assertThat(indexer.resolveTopK(patientId)).isEqualTo(6);
    }

    @Test
    void resolveTopK_returns10_whenIndexed9to15() {
        UUID patientId = UUID.randomUUID();
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString())).thenReturn(12);

        assertThat(indexer.resolveTopK(patientId)).isEqualTo(10);
    }

    @Test
    void resolveTopK_returns15_whenIndexedMoreThan15() {
        UUID patientId = UUID.randomUUID();
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString())).thenReturn(25);

        assertThat(indexer.resolveTopK(patientId)).isEqualTo(15);
    }

    @Test
    void resolveTopK_returns6_whenNull() {
        UUID patientId = UUID.randomUUID();
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString())).thenReturn(null);

        assertThat(indexer.resolveTopK(patientId)).isEqualTo(6);
    }

    @Test
    void indexPatient_withEmptyRecords_doesNotCallVectorStore() {
        UUID patientId = UUID.randomUUID();
        when(medicalRecordRepository.findByPatientIdEager(patientId)).thenReturn(List.of());

        indexer.indexPatient(patientId);

        verify(vectorStore, org.mockito.Mockito.never()).add(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void indexPatient_withRecords_indexesDocuments() {
        UUID patientId = UUID.randomUUID();
        Patient patient = new Patient();
        ReflectionTestUtils.setField(patient, "id", patientId);

        MedicalRecord record = new MedicalRecord();
        ReflectionTestUtils.setField(record, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(record, "patient", patient);
        ReflectionTestUtils.setField(record, "recordDate", OffsetDateTime.now());
        ReflectionTestUtils.setField(record, "clinicalNotes", "Notas clinicas");

        when(medicalRecordRepository.findByPatientIdEager(patientId)).thenReturn(List.of(record));
        when(diagnosisRepository.findByMedicalRecordId(record.getId())).thenReturn(List.of());
        when(prescriptionRepository.findAllByMedicalRecordIdEager(record.getId()))
                .thenReturn(List.of());
        when(procedureRepository.findAllByMedicalRecordId(record.getId())).thenReturn(List.of());

        indexer.indexPatient(patientId);

        verify(vectorStore).add(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void reindexRecord_whenNotFound_doesNotCallVectorStore() {
        UUID recordId = UUID.randomUUID();
        when(jdbc.update(anyString(), anyString())).thenReturn(0);
        when(medicalRecordRepository.findByIdWithPatient(recordId)).thenReturn(Optional.empty());

        indexer.reindexRecord(recordId);

        verify(vectorStore, org.mockito.Mockito.never()).add(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void reindexRecord_whenFound_reindexes() {
        UUID recordId = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();
        Patient patient = new Patient();
        ReflectionTestUtils.setField(patient, "id", patientId);

        MedicalRecord record = new MedicalRecord();
        ReflectionTestUtils.setField(record, "id", recordId);
        ReflectionTestUtils.setField(record, "patient", patient);
        ReflectionTestUtils.setField(record, "recordDate", OffsetDateTime.now());
        ReflectionTestUtils.setField(record, "clinicalNotes", "Notas");

        when(jdbc.update(anyString(), anyString(), anyString())).thenReturn(1);
        when(medicalRecordRepository.findByIdWithPatient(recordId)).thenReturn(Optional.of(record));
        when(diagnosisRepository.findByMedicalRecordId(recordId)).thenReturn(List.of());
        when(prescriptionRepository.findAllByMedicalRecordIdEager(recordId)).thenReturn(List.of());
        when(procedureRepository.findAllByMedicalRecordId(recordId)).thenReturn(List.of());

        indexer.reindexRecord(recordId);

        verify(vectorStore).add(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void isPatientFullyIndexed_trueWhenIndexedCoversAllRecords() {
        UUID patientId = UUID.randomUUID();
        when(medicalRecordRepository.countByPatientId(patientId)).thenReturn(3L);
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString())).thenReturn(3);

        assertThat(indexer.isPatientFullyIndexed(patientId)).isTrue();
    }

    @Test
    void isPatientFullyIndexed_falseWhenIndexIsPartial() {
        UUID patientId = UUID.randomUUID();
        when(medicalRecordRepository.countByPatientId(patientId)).thenReturn(3L);
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString())).thenReturn(2);

        assertThat(indexer.isPatientFullyIndexed(patientId)).isFalse();
    }

    @Test
    void isPatientFullyIndexed_trueWhenPatientHasNoRecords() {
        UUID patientId = UUID.randomUUID();
        when(medicalRecordRepository.countByPatientId(patientId)).thenReturn(0L);

        assertThat(indexer.isPatientFullyIndexed(patientId)).isTrue();
    }

    @Test
    void scheduleReindex_withoutTransaction_reindexesImmediately() {
        UUID recordId = UUID.randomUUID();
        Patient patient = new Patient();
        ReflectionTestUtils.setField(patient, "id", UUID.randomUUID());

        MedicalRecord record = new MedicalRecord();
        ReflectionTestUtils.setField(record, "id", recordId);
        ReflectionTestUtils.setField(record, "patient", patient);
        ReflectionTestUtils.setField(record, "recordDate", OffsetDateTime.now());
        ReflectionTestUtils.setField(record, "clinicalNotes", "Notas");

        when(medicalRecordRepository.findByIdWithPatient(recordId)).thenReturn(Optional.of(record));
        when(diagnosisRepository.findByMedicalRecordId(recordId)).thenReturn(List.of());
        when(prescriptionRepository.findAllByMedicalRecordIdEager(recordId)).thenReturn(List.of());
        when(procedureRepository.findAllByMedicalRecordId(recordId)).thenReturn(List.of());
        when(jdbc.update(anyString(), anyString(), anyString())).thenReturn(1);

        indexer.scheduleReindex(recordId);

        verify(vectorStore).add(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void buildSummaryContext_emptyRecords_returnsEmpty() {
        UUID patientId = UUID.randomUUID();
        when(medicalRecordRepository.findByPatientIdEager(patientId)).thenReturn(List.of());

        assertThat(indexer.buildSummaryContext(patientId)).isEmpty();
    }

    @Test
    void buildSummaryContext_withRecords_returnsNonEmpty() {
        UUID patientId = UUID.randomUUID();
        Patient patient = new Patient();
        ReflectionTestUtils.setField(patient, "id", patientId);

        MedicalRecord record = new MedicalRecord();
        ReflectionTestUtils.setField(record, "patient", patient);
        ReflectionTestUtils.setField(record, "recordDate", OffsetDateTime.now());

        when(medicalRecordRepository.findByPatientIdEager(patientId)).thenReturn(List.of(record));
        when(diagnosisRepository.findAllByPatientId(patientId)).thenReturn(List.of());
        when(prescriptionRepository.findAllByPatientIdEager(patientId)).thenReturn(List.of());
        when(procedureRepository.findAllByPatientId(patientId)).thenReturn(List.of());

        String context = indexer.buildSummaryContext(patientId);
        assertThat(context).contains("Historial");
    }

    @Test
    void buildSummaryContext_deduplicatesDiagnosesPrescriptionsAndProcedures() {
        UUID patientId = UUID.randomUUID();
        MedicalRecord older = record(patientId, OffsetDateTime.now().minusMonths(2));
        MedicalRecord newer = record(patientId, OffsetDateTime.now());
        when(medicalRecordRepository.findByPatientIdEager(patientId)).thenReturn(List.of(newer, older));

        Diagnosis hta = diagnosis("I10", "Hipertension");
        Diagnosis htaAgain = diagnosis("I10", "Hipertension");
        Diagnosis dm2 = diagnosis("E11.9", "Diabetes tipo 2");
        when(diagnosisRepository.findAllByPatientId(patientId)).thenReturn(List.of(hta, htaAgain, dm2));

        Prescription losartan = prescription("Losartan");
        Prescription losartanAgain = prescription("Losartan");
        when(prescriptionRepository.findAllByPatientIdEager(patientId)).thenReturn(List.of(losartan, losartanAgain));

        Procedure procedure = procedure("Sutura simple");
        when(procedureRepository.findAllByPatientId(patientId)).thenReturn(List.of(procedure, procedure));

        String context = indexer.buildSummaryContext(patientId);

        assertThat(context)
                .contains("2 expedientes")
                .contains("I10: Hipertension (2 consultas)")
                .contains("E11.9: Diabetes tipo 2")
                .contains("Losartan (2 prescripciones)")
                .contains("Sutura simple")
                .contains("Período del historial");
        assertThat(context.split("Sutura simple", -1)).hasSize(2);
    }

    @Test
    void indexPatient_removesStaleDocumentsButKeepsCurrent() {
        UUID patientId = UUID.randomUUID();
        MedicalRecord current = record(patientId, OffsetDateTime.now());
        when(medicalRecordRepository.findByPatientIdEager(patientId)).thenReturn(List.of(current));
        when(diagnosisRepository.findByMedicalRecordId(current.getId())).thenReturn(List.of());
        when(prescriptionRepository.findAllByMedicalRecordIdEager(current.getId()))
                .thenReturn(List.of());
        when(procedureRepository.findAllByMedicalRecordId(current.getId())).thenReturn(List.of());
        when(jdbc.queryForList(anyString(), eq(String.class), anyString()))
                .thenReturn(List.of(current.getId().toString(), "stale-id"));

        indexer.indexPatient(patientId);

        verify(jdbc).update(anyString(), eq("stale-id"));
    }

    @Test
    void reindexRecord_buildsDocumentTextWithClinicalDetails() {
        UUID patientId = UUID.randomUUID();
        MedicalRecord record = record(patientId, OffsetDateTime.now());
        ReflectionTestUtils.setField(record, "physicalExam", "PA 120/80");
        when(medicalRecordRepository.findByIdWithPatient(record.getId())).thenReturn(Optional.of(record));

        Diagnosis diagnosis = diagnosis("I10", "Hipertension");
        when(diagnosis.getSeverity()).thenReturn(Severity.MODERATE);
        when(diagnosisRepository.findByMedicalRecordId(record.getId())).thenReturn(List.of(diagnosis));

        Prescription prescription = prescription("Losartan");
        when(prescription.getDosage()).thenReturn("50 mg");
        when(prescription.getFrequency()).thenReturn("cada 24h");
        when(prescription.getDurationDays()).thenReturn(30);
        when(prescription.getInstructions()).thenReturn("con agua");
        when(prescriptionRepository.findAllByMedicalRecordIdEager(record.getId()))
                .thenReturn(List.of(prescription));

        Procedure procedure = procedure("Sutura simple");
        when(procedure.getProcedureCode()).thenReturn("PROC-1");
        when(procedureRepository.findAllByMedicalRecordId(record.getId())).thenReturn(List.of(procedure));
        when(jdbc.update(anyString(), anyString(), anyString())).thenReturn(1);

        indexer.reindexRecord(record.getId());

        ArgumentCaptor<List<Document>> captor = ArgumentCaptor.forClass(List.class);
        verify(vectorStore).add(captor.capture());
        String text = captor.getValue().getFirst().getText();
        assertThat(text)
                .contains("Examen físico: PA 120/80")
                .contains("I10: Hipertension [MODERATE]")
                .contains("Losartan — 50 mg, cada 24h, 30 días (con agua)")
                .contains("PROC-1: Sutura simple");
    }

    @Test
    void reindexSafely_retriesUntilSuccess() {
        UUID patientId = UUID.randomUUID();
        MedicalRecord record = record(patientId, OffsetDateTime.now());
        when(medicalRecordRepository.findByIdWithPatient(record.getId())).thenReturn(Optional.of(record));
        when(diagnosisRepository.findByMedicalRecordId(record.getId())).thenReturn(List.of());
        when(prescriptionRepository.findAllByMedicalRecordIdEager(record.getId()))
                .thenReturn(List.of());
        when(procedureRepository.findAllByMedicalRecordId(record.getId())).thenReturn(List.of());
        when(jdbc.update(anyString(), anyString(), anyString())).thenReturn(1);
        org.mockito.Mockito.doThrow(new IllegalStateException("embedding down"))
                .doThrow(new IllegalStateException("embedding down"))
                .doNothing()
                .when(vectorStore)
                .add(org.mockito.ArgumentMatchers.anyList());

        indexer.scheduleReindex(record.getId());

        verify(vectorStore, org.mockito.Mockito.times(3)).add(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void isPatientFullyIndexed_falseWhenIndexedCountIsNull() {
        UUID patientId = UUID.randomUUID();
        when(medicalRecordRepository.countByPatientId(patientId)).thenReturn(2L);
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString())).thenReturn(null);

        assertThat(indexer.isPatientFullyIndexed(patientId)).isFalse();
    }

    private MedicalRecord record(UUID patientId, OffsetDateTime date) {
        Patient patient = new Patient();
        ReflectionTestUtils.setField(patient, "id", patientId);
        MedicalRecord record = new MedicalRecord();
        ReflectionTestUtils.setField(record, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(record, "patient", patient);
        ReflectionTestUtils.setField(record, "recordDate", date);
        ReflectionTestUtils.setField(record, "clinicalNotes", "Notas clinicas");
        return record;
    }

    private Diagnosis diagnosis(String code, String description) {
        Diagnosis diagnosis = org.mockito.Mockito.mock(Diagnosis.class);
        when(diagnosis.getIcd10Code()).thenReturn(code);
        when(diagnosis.getDescription()).thenReturn(description);
        return diagnosis;
    }

    private Prescription prescription(String name) {
        Prescription prescription = org.mockito.Mockito.mock(Prescription.class);
        com.fepdev.sfm.backend.domain.catalog.MedicationsCatalog medication =
                org.mockito.Mockito.mock(com.fepdev.sfm.backend.domain.catalog.MedicationsCatalog.class);
        when(medication.getName()).thenReturn(name);
        when(prescription.getMedication()).thenReturn(medication);
        return prescription;
    }

    private Procedure procedure(String description) {
        Procedure procedure = org.mockito.Mockito.mock(Procedure.class);
        when(procedure.getDescription()).thenReturn(description);
        return procedure;
    }
}
