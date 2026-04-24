package com.fepdev.sfm.backend.domain.medicalrecord;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.domain.appointment.Appointment;
import com.fepdev.sfm.backend.domain.appointment.Status;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.DiagnosisCreateRequest;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.DiagnosisResponse;
import com.fepdev.sfm.backend.ai.history.PatientHistoryIndexer;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
class DiagnosisServiceTest {

    @Mock
    DiagnosisRepository diagnosisRepository;

    @Mock
    DiagnosisMapper diagnosisMapper;

    @Mock
    MedicalRecordRepository medicalRecordRepository;

    @Mock
    PatientHistoryIndexer historyIndexer;

    @InjectMocks
    DiagnosisService diagnosisService;

    @Test
    void addDiagnosis_whenMedicalRecordNotFound_throwsEntityNotFoundException() {
        DiagnosisCreateRequest request = new DiagnosisCreateRequest(
                UUID.randomUUID(), UUID.randomUUID(), "J02.9", "Faringitis", Severity.MILD, OffsetDateTime.now());
        when(medicalRecordRepository.findById(request.medicalRecordId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> diagnosisService.addDiagnosis(request))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void addDiagnosis_whenAppointmentMismatch_throwsBusinessRuleException() {
        UUID medicalRecordId = UUID.randomUUID();
        UUID appointmentId = UUID.randomUUID();
        DiagnosisCreateRequest request = new DiagnosisCreateRequest(
                appointmentId, medicalRecordId, "J02.9", "Faringitis", Severity.MILD, OffsetDateTime.now());

        Appointment appointment = new Appointment();
        ReflectionTestUtils.setField(appointment, "id", UUID.randomUUID());
        appointment.setStatus(Status.IN_PROGRESS);
        MedicalRecord mr = new MedicalRecord();
        mr.setAppointment(appointment);

        when(medicalRecordRepository.findById(medicalRecordId)).thenReturn(Optional.of(mr));

        assertThatThrownBy(() -> diagnosisService.addDiagnosis(request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("misma consulta");
    }

    @Test
    void addDiagnosis_whenAppointmentInvalidStatus_throwsBusinessRuleException() {
        UUID medicalRecordId = UUID.randomUUID();
        UUID appointmentId = UUID.randomUUID();
        DiagnosisCreateRequest request = new DiagnosisCreateRequest(
                appointmentId, medicalRecordId, "J02.9", "Faringitis", Severity.MILD, OffsetDateTime.now());

        Appointment appointment = new Appointment();
        ReflectionTestUtils.setField(appointment, "id", appointmentId);
        appointment.setStatus(Status.SCHEDULED);
        MedicalRecord mr = new MedicalRecord();
        mr.setAppointment(appointment);

        when(medicalRecordRepository.findById(medicalRecordId)).thenReturn(Optional.of(mr));

        assertThatThrownBy(() -> diagnosisService.addDiagnosis(request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("IN_PROGRESS o COMPLETED");
    }

    @Test
    void addDiagnosis_whenValidRequest_savesAndReturnsResponse() {
        UUID medicalRecordId = UUID.randomUUID();
        UUID appointmentId = UUID.randomUUID();
        DiagnosisCreateRequest request = new DiagnosisCreateRequest(
                appointmentId, medicalRecordId, "J02.9", "Faringitis", Severity.MODERATE, OffsetDateTime.now());

        Appointment appointment = new Appointment();
        ReflectionTestUtils.setField(appointment, "id", appointmentId);
        appointment.setStatus(Status.COMPLETED);
        MedicalRecord mr = new MedicalRecord();
        mr.setAppointment(appointment);

        Diagnosis entity = new Diagnosis();
        DiagnosisResponse response = new DiagnosisResponse(
                UUID.randomUUID(), appointmentId, medicalRecordId, "J02.9", "Faringitis",
                Severity.MODERATE, OffsetDateTime.now(), OffsetDateTime.now());

        when(medicalRecordRepository.findById(medicalRecordId)).thenReturn(Optional.of(mr));
        when(diagnosisMapper.toEntity(request)).thenReturn(entity);
        when(diagnosisRepository.save(entity)).thenReturn(entity);
        when(diagnosisMapper.toResponse(entity)).thenReturn(response);

        DiagnosisResponse result = diagnosisService.addDiagnosis(request);

        assertThat(result).isEqualTo(response);
        assertThat(entity.getMedicalRecord()).isEqualTo(mr);
        assertThat(entity.getAppointment()).isEqualTo(appointment);
    }

    @Test
    void getDiagnosesByMedicalRecord_whenNotFound_throwsEntityNotFoundException() {
        UUID medicalRecordId = UUID.randomUUID();
        when(medicalRecordRepository.existsById(medicalRecordId)).thenReturn(false);

        assertThatThrownBy(() -> diagnosisService.getDiagnosesByMedicalRecord(medicalRecordId, Pageable.unpaged()))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void getDiagnosesByMedicalRecord_whenFound_returnsPage() {
        UUID medicalRecordId = UUID.randomUUID();
        Diagnosis diagnosis = new Diagnosis();
        DiagnosisResponse response = new DiagnosisResponse(
                UUID.randomUUID(), UUID.randomUUID(), medicalRecordId, "E11.9", "Diabetes",
                Severity.MODERATE, OffsetDateTime.now(), OffsetDateTime.now());
        Pageable pageable = Pageable.ofSize(10);

        when(medicalRecordRepository.existsById(medicalRecordId)).thenReturn(true);
        when(diagnosisRepository.findByMedicalRecordId(medicalRecordId, pageable))
                .thenReturn(new PageImpl<>(java.util.List.of(diagnosis), pageable, 1));
        when(diagnosisMapper.toResponse(diagnosis)).thenReturn(response);

        var page = diagnosisService.getDiagnosesByMedicalRecord(medicalRecordId, pageable);

        assertThat(page.getTotalElements()).isEqualTo(1);
        verify(diagnosisRepository).findByMedicalRecordId(medicalRecordId, pageable);
    }

    @Test
    void getDiagnosesByIcd10Code_returnsMappedPage() {
        Diagnosis diagnosis = new Diagnosis();
        DiagnosisResponse response = new DiagnosisResponse(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), "J02.9", "Faringitis",
                Severity.MILD, OffsetDateTime.now(), OffsetDateTime.now());
        Pageable pageable = Pageable.ofSize(10);

        when(diagnosisRepository.findByIcd10Code("J02.9", pageable))
                .thenReturn(new PageImpl<>(java.util.List.of(diagnosis), pageable, 1));
        when(diagnosisMapper.toResponse(diagnosis)).thenReturn(response);

        var page = diagnosisService.getDiagnosesByIcd10Code("J02.9", pageable);

        assertThat(page.getContent().getFirst().icd10Code()).isEqualTo("J02.9");
        verify(diagnosisRepository).findByIcd10Code("J02.9", pageable);
    }
}
