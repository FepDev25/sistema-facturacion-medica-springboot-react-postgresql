package com.fepdev.sfm.backend.domain.medicalrecord;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import com.fepdev.sfm.backend.domain.appointment.Status;
import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalog;
import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalogRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.PrescriptionCreateRequest;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.PrescriptionResponse;
import com.fepdev.sfm.backend.ai.history.PatientHistoryIndexer;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
class PrescriptionServiceTest {

    @Mock
    PrescriptionRepository prescriptionRepository;

    @Mock
    PrescriptionMapper prescriptionMapper;

    @Mock
    MedicalRecordRepository medicalRecordRepository;

    @Mock
    MedicationsCatalogRepository medicationRepository;

    @Mock
    PatientHistoryIndexer historyIndexer;

    @InjectMocks
    PrescriptionService prescriptionService;

    @Test
    void createPrescription_whenMedicalRecordNotFound_throwsEntityNotFoundException() {
        PrescriptionCreateRequest request = new PrescriptionCreateRequest(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), "500mg", "q8h", 5, null);
        when(medicalRecordRepository.findById(request.medicalRecordId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> prescriptionService.createPrescription(request))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void createPrescription_whenAppointmentMismatch_throwsBusinessRuleException() {
        UUID appointmentId = UUID.randomUUID();
        UUID medicalRecordId = UUID.randomUUID();
        PrescriptionCreateRequest request = new PrescriptionCreateRequest(
                appointmentId, medicalRecordId, UUID.randomUUID(), "500mg", "q8h", 5, null);

        Appointment appointment = new Appointment();
        ReflectionTestUtils.setField(appointment, "id", UUID.randomUUID());
        appointment.setStatus(Status.IN_PROGRESS);
        MedicalRecord medicalRecord = new MedicalRecord();
        medicalRecord.setAppointment(appointment);

        when(medicalRecordRepository.findById(medicalRecordId)).thenReturn(Optional.of(medicalRecord));

        assertThatThrownBy(() -> prescriptionService.createPrescription(request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("misma consulta");
    }

    @Test
    void createPrescription_whenAppointmentInvalidStatus_throwsBusinessRuleException() {
        UUID appointmentId = UUID.randomUUID();
        UUID medicalRecordId = UUID.randomUUID();
        PrescriptionCreateRequest request = new PrescriptionCreateRequest(
                appointmentId, medicalRecordId, UUID.randomUUID(), "500mg", "q8h", 5, null);

        Appointment appointment = new Appointment();
        ReflectionTestUtils.setField(appointment, "id", appointmentId);
        appointment.setStatus(Status.SCHEDULED);
        MedicalRecord medicalRecord = new MedicalRecord();
        medicalRecord.setAppointment(appointment);

        when(medicalRecordRepository.findById(medicalRecordId)).thenReturn(Optional.of(medicalRecord));

        assertThatThrownBy(() -> prescriptionService.createPrescription(request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("IN_PROGRESS o COMPLETED");
    }

    @Test
    void createPrescription_whenMedicationNotFound_throwsEntityNotFoundException() {
        UUID appointmentId = UUID.randomUUID();
        UUID medicalRecordId = UUID.randomUUID();
        UUID medicationId = UUID.randomUUID();
        PrescriptionCreateRequest request = new PrescriptionCreateRequest(
                appointmentId, medicalRecordId, medicationId, "500mg", "q8h", 5, null);

        Appointment appointment = new Appointment();
        ReflectionTestUtils.setField(appointment, "id", appointmentId);
        appointment.setStatus(Status.COMPLETED);
        MedicalRecord medicalRecord = new MedicalRecord();
        medicalRecord.setAppointment(appointment);

        when(medicalRecordRepository.findById(medicalRecordId)).thenReturn(Optional.of(medicalRecord));
        when(medicationRepository.findById(medicationId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> prescriptionService.createPrescription(request))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void createPrescription_whenValidRequest_returnsResponse() {
        UUID appointmentId = UUID.randomUUID();
        UUID medicalRecordId = UUID.randomUUID();
        UUID medicationId = UUID.randomUUID();
        PrescriptionCreateRequest request = new PrescriptionCreateRequest(
                appointmentId, medicalRecordId, medicationId, "500mg", "q8h", 5, "tomar con comida");

        Appointment appointment = new Appointment();
        ReflectionTestUtils.setField(appointment, "id", appointmentId);
        appointment.setStatus(Status.COMPLETED);
        MedicalRecord medicalRecord = new MedicalRecord();
        medicalRecord.setAppointment(appointment);
        MedicationsCatalog medication = new MedicationsCatalog();

        Prescription entity = new Prescription();
        PrescriptionResponse response = new PrescriptionResponse(
                UUID.randomUUID(), appointmentId, medicalRecordId, medicationId, "Amoxicilina",
                "500mg", "q8h", 5, "tomar con comida", java.time.OffsetDateTime.now());

        when(medicalRecordRepository.findById(medicalRecordId)).thenReturn(Optional.of(medicalRecord));
        when(medicationRepository.findById(medicationId)).thenReturn(Optional.of(medication));
        when(prescriptionMapper.toEntity(request)).thenReturn(entity);
        when(prescriptionRepository.save(entity)).thenReturn(entity);
        when(prescriptionMapper.toResponse(entity)).thenReturn(response);

        PrescriptionResponse result = prescriptionService.createPrescription(request);

        assertThat(result).isEqualTo(response);
        assertThat(entity.getAppointment()).isEqualTo(appointment);
        assertThat(entity.getMedicalRecord()).isEqualTo(medicalRecord);
        assertThat(entity.getMedication()).isEqualTo(medication);
    }

    @Test
    void getPrescriptionsByMedicalRecord_whenNotFound_throwsEntityNotFoundException() {
        UUID medicalRecordId = UUID.randomUUID();
        when(medicalRecordRepository.existsById(medicalRecordId)).thenReturn(false);

        assertThatThrownBy(() -> prescriptionService.getPrescriptionsByMedicalRecord(medicalRecordId, Pageable.unpaged()))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void getPrescriptionsByMedicalRecord_whenFound_returnsMappedPage() {
        UUID medicalRecordId = UUID.randomUUID();
        Prescription entity = new Prescription();
        PrescriptionResponse response = new PrescriptionResponse(
                UUID.randomUUID(), UUID.randomUUID(), medicalRecordId, UUID.randomUUID(), "Amoxicilina",
                "500mg", "q8h", 5, null, java.time.OffsetDateTime.now());
        Pageable pageable = Pageable.ofSize(10);

        when(medicalRecordRepository.existsById(medicalRecordId)).thenReturn(true);
        when(prescriptionRepository.findByMedicalRecordId(medicalRecordId, pageable))
                .thenReturn(new PageImpl<>(java.util.List.of(entity), pageable, 1));
        when(prescriptionMapper.toResponse(entity)).thenReturn(response);

        var page = prescriptionService.getPrescriptionsByMedicalRecord(medicalRecordId, pageable);

        assertThat(page.getTotalElements()).isEqualTo(1);
        verify(prescriptionRepository).findByMedicalRecordId(medicalRecordId, pageable);
    }

    @Test
    void hasPrescriptionForMedication_delegatesToRepository() {
        UUID appointmentId = UUID.randomUUID();
        UUID medicationId = UUID.randomUUID();
        when(prescriptionRepository.existsByAppointmentIdAndMedicationId(appointmentId, medicationId)).thenReturn(true);

        boolean result = prescriptionService.hasPrescriptionForMedication(appointmentId, medicationId);

        assertThat(result).isTrue();
        verify(prescriptionRepository).existsByAppointmentIdAndMedicationId(appointmentId, medicationId);
    }
}
