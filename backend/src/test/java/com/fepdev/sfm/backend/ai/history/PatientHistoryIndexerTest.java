package com.fepdev.sfm.backend.ai.history;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.domain.medicalrecord.DiagnosisRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecord;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecordRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.PrescriptionRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.ProcedureRepository;
import com.fepdev.sfm.backend.domain.patient.Patient;

@ExtendWith(MockitoExtension.class)
class PatientHistoryIndexerTest {

    @Mock VectorStore vectorStore;
    @Mock JdbcTemplate jdbc;
    @Mock MedicalRecordRepository medicalRecordRepository;
    @Mock DiagnosisRepository diagnosisRepository;
    @Mock PrescriptionRepository prescriptionRepository;
    @Mock ProcedureRepository procedureRepository;

    @InjectMocks
    PatientHistoryIndexer indexer;

    @Test
    void isPatientIndexed_returnsTrue_whenCountGreaterThanZero() {
        UUID patientId = UUID.randomUUID();
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString()))
                .thenReturn(5);

        assertThat(indexer.isPatientIndexed(patientId)).isTrue();
    }

    @Test
    void isPatientIndexed_returnsFalse_whenCountIsZero() {
        UUID patientId = UUID.randomUUID();
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString()))
                .thenReturn(0);

        assertThat(indexer.isPatientIndexed(patientId)).isFalse();
    }

    @Test
    void isPatientIndexed_returnsFalse_whenNull() {
        UUID patientId = UUID.randomUUID();
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString()))
                .thenReturn(null);

        assertThat(indexer.isPatientIndexed(patientId)).isFalse();
    }

    @Test
    void resolveTopK_returns6_whenIndexed8orLess() {
        UUID patientId = UUID.randomUUID();
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString()))
                .thenReturn(8);

        assertThat(indexer.resolveTopK(patientId)).isEqualTo(6);
    }

    @Test
    void resolveTopK_returns6_whenIndexed5() {
        UUID patientId = UUID.randomUUID();
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString()))
                .thenReturn(5);

        assertThat(indexer.resolveTopK(patientId)).isEqualTo(6);
    }

    @Test
    void resolveTopK_returns10_whenIndexed9to15() {
        UUID patientId = UUID.randomUUID();
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString()))
                .thenReturn(12);

        assertThat(indexer.resolveTopK(patientId)).isEqualTo(10);
    }

    @Test
    void resolveTopK_returns15_whenIndexedMoreThan15() {
        UUID patientId = UUID.randomUUID();
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString()))
                .thenReturn(25);

        assertThat(indexer.resolveTopK(patientId)).isEqualTo(15);
    }

    @Test
    void resolveTopK_returns6_whenNull() {
        UUID patientId = UUID.randomUUID();
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString()))
                .thenReturn(null);

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
        when(prescriptionRepository.findAllByMedicalRecordIdEager(record.getId())).thenReturn(List.of());
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

        when(jdbc.update(anyString(), anyString())).thenReturn(1);
        when(medicalRecordRepository.findByIdWithPatient(recordId)).thenReturn(Optional.of(record));
        when(diagnosisRepository.findByMedicalRecordId(recordId)).thenReturn(List.of());
        when(prescriptionRepository.findAllByMedicalRecordIdEager(recordId)).thenReturn(List.of());
        when(procedureRepository.findAllByMedicalRecordId(recordId)).thenReturn(List.of());

        indexer.reindexRecord(recordId);

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
}
