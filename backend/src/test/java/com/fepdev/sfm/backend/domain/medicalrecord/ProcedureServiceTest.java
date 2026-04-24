package com.fepdev.sfm.backend.domain.medicalrecord;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.domain.appointment.Appointment;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.ProcedureCreateRequest;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.ProcedureResponse;
import com.fepdev.sfm.backend.ai.history.PatientHistoryIndexer;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
class ProcedureServiceTest {

    @Mock
    ProcedureRepository procedureRepository;

    @Mock
    ProcedureMapper procedureMapper;

    @Mock
    MedicalRecordRepository medicalRecordRepository;

    @Mock
    PatientHistoryIndexer historyIndexer;

    @InjectMocks
    ProcedureService procedureService;

    @Test
    void createProcedure_whenMedicalRecordNotFound_throwsEntityNotFoundException() {
        ProcedureCreateRequest request = new ProcedureCreateRequest(
                UUID.randomUUID(), UUID.randomUUID(), "PROC-1", "Lavado", null, OffsetDateTime.now());
        when(medicalRecordRepository.findById(request.medicalRecordId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> procedureService.createProcedure(request))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void createProcedure_whenAppointmentMismatch_throwsBusinessRuleException() {
        UUID appointmentId = UUID.randomUUID();
        UUID medicalRecordId = UUID.randomUUID();
        ProcedureCreateRequest request = new ProcedureCreateRequest(
                appointmentId, medicalRecordId, "PROC-1", "Lavado", null, OffsetDateTime.now());

        Appointment appointment = new Appointment();
        ReflectionTestUtils.setField(appointment, "id", UUID.randomUUID());
        MedicalRecord medicalRecord = new MedicalRecord();
        medicalRecord.setAppointment(appointment);

        when(medicalRecordRepository.findById(medicalRecordId)).thenReturn(Optional.of(medicalRecord));

        assertThatThrownBy(() -> procedureService.createProcedure(request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("misma consulta");
    }

    @Test
    void createProcedure_whenValidRequest_returnsResponse() {
        UUID appointmentId = UUID.randomUUID();
        UUID medicalRecordId = UUID.randomUUID();
        ProcedureCreateRequest request = new ProcedureCreateRequest(
                appointmentId, medicalRecordId, "PROC-1", "Lavado", "ok", OffsetDateTime.now());

        Appointment appointment = new Appointment();
        ReflectionTestUtils.setField(appointment, "id", appointmentId);
        MedicalRecord medicalRecord = new MedicalRecord();
        medicalRecord.setAppointment(appointment);

        Procedure entity = new Procedure();
        ProcedureResponse response = new ProcedureResponse(
                UUID.randomUUID(), appointmentId, medicalRecordId, "PROC-1", "Lavado", "ok",
                OffsetDateTime.now(), OffsetDateTime.now());

        when(medicalRecordRepository.findById(medicalRecordId)).thenReturn(Optional.of(medicalRecord));
        when(procedureMapper.toEntity(request)).thenReturn(entity);
        when(procedureRepository.save(entity)).thenReturn(entity);
        when(procedureMapper.toResponse(entity)).thenReturn(response);

        ProcedureResponse result = procedureService.createProcedure(request);

        assertThat(result).isEqualTo(response);
        assertThat(entity.getAppointment()).isEqualTo(appointment);
        assertThat(entity.getMedicalRecord()).isEqualTo(medicalRecord);
    }

    @Test
    void getProceduresByMedicalRecordId_whenMedicalRecordNotFound_throwsEntityNotFoundException() {
        UUID medicalRecordId = UUID.randomUUID();
        when(medicalRecordRepository.existsById(medicalRecordId)).thenReturn(false);

        assertThatThrownBy(() -> procedureService.getProceduresByMedicalRecordId(medicalRecordId, Pageable.unpaged()))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void getProceduresByMedicalRecordId_whenFound_returnsMappedPage() {
        UUID medicalRecordId = UUID.randomUUID();
        Procedure procedure = new Procedure();
        ProcedureResponse response = new ProcedureResponse(
                UUID.randomUUID(), UUID.randomUUID(), medicalRecordId, "PROC-2", "Sutura", null,
                OffsetDateTime.now(), OffsetDateTime.now());
        Pageable pageable = Pageable.ofSize(10);

        when(medicalRecordRepository.existsById(medicalRecordId)).thenReturn(true);
        when(procedureRepository.findByMedicalRecordId(medicalRecordId, pageable))
                .thenReturn(new PageImpl<>(java.util.List.of(procedure), pageable, 1));
        when(procedureMapper.toResponse(procedure)).thenReturn(response);

        var page = procedureService.getProceduresByMedicalRecordId(medicalRecordId, pageable);

        assertThat(page.getTotalElements()).isEqualTo(1);
        verify(procedureRepository).findByMedicalRecordId(medicalRecordId, pageable);
    }
}
