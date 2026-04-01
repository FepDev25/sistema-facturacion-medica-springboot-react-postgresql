package com.fepdev.sfm.backend.domain.medicalrecord;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import com.fepdev.sfm.backend.domain.medicalrecord.dto.MedicalRecordResponse;

import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
class MedicalRecordServiceTest {

    @Mock
    MedicalRecordRepository medicalRecordRepository;

    @Mock
    MedicalRecordMapper medicalRecordMapper;

    @InjectMocks
    MedicalRecordService medicalRecordService;

    @Test
    void getMedicalRecordById_whenNotFound_throwsEntityNotFoundException() {
        UUID id = UUID.randomUUID();
        when(medicalRecordRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> medicalRecordService.getMedicalRecordById(id))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void getMedicalRecordById_whenFound_returnsMappedResponse() {
        UUID id = UUID.randomUUID();
        MedicalRecord entity = new MedicalRecord();
        MedicalRecordResponse response = new MedicalRecordResponse(
                id, UUID.randomUUID(), "Ana", "Lopez", UUID.randomUUID(), Map.of("hr", 70),
                "normal", "ok", OffsetDateTime.now(), OffsetDateTime.now(), OffsetDateTime.now());
        when(medicalRecordRepository.findById(id)).thenReturn(Optional.of(entity));
        when(medicalRecordMapper.toResponse(entity)).thenReturn(response);

        MedicalRecordResponse result = medicalRecordService.getMedicalRecordById(id);

        assertThat(result).isEqualTo(response);
    }

    @Test
    void getMedicalRecordByAppointmentId_whenNotFound_throwsEntityNotFoundException() {
        UUID appointmentId = UUID.randomUUID();
        when(medicalRecordRepository.findByAppointmentId(appointmentId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> medicalRecordService.getMedicalRecordByAppointmentId(appointmentId))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void getMedicalRecordsByPatientId_whenRepositoryExistCheckFails_throwsEntityNotFoundException() {
        UUID patientId = UUID.randomUUID();
        when(medicalRecordRepository.existsById(patientId)).thenReturn(false);

        assertThatThrownBy(() -> medicalRecordService.getMedicalRecordsByPatientId(patientId, Pageable.unpaged()))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void getMedicalRecordsByPatientId_whenExists_returnsMappedPage() {
        UUID patientId = UUID.randomUUID();
        MedicalRecord entity = new MedicalRecord();
        MedicalRecordResponse response = new MedicalRecordResponse(
                UUID.randomUUID(), patientId, "Ana", "Lopez", UUID.randomUUID(), Map.of(),
                null, "nota", OffsetDateTime.now(), OffsetDateTime.now(), OffsetDateTime.now());
        Pageable pageable = Pageable.ofSize(10);

        when(medicalRecordRepository.existsById(patientId)).thenReturn(true);
        when(medicalRecordRepository.findByPatientId(patientId, pageable))
                .thenReturn(new PageImpl<>(java.util.List.of(entity), pageable, 1));
        when(medicalRecordMapper.toResponse(entity)).thenReturn(response);

        var page = medicalRecordService.getMedicalRecordsByPatientId(patientId, pageable);

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().getFirst().patientId()).isEqualTo(patientId);
    }
}
