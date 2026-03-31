package com.fepdev.sfm.backend.domain.appointment;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentCreateRequest;
import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentResponse;
import com.fepdev.sfm.backend.domain.doctor.Doctor;
import com.fepdev.sfm.backend.domain.doctor.DoctorRepository;
import com.fepdev.sfm.backend.domain.invoice.InvoiceService;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecord;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecordMapper;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecordRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.MedicalRecordCreateRequest;
import com.fepdev.sfm.backend.domain.patient.Patient;
import com.fepdev.sfm.backend.domain.patient.PatientRepository;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
class AppointmentServiceTest {

    @Mock AppointmentRepository appointmentRepository;
    @Mock AppointmentMapper appointmentMapper;
    @Mock DoctorRepository doctorRepository;
    @Mock PatientRepository patientRepository;
    @Mock MedicalRecordRepository medicalRecordRepository;
    @Mock MedicalRecordMapper medicalRecordMapper;
    @Mock InvoiceService invoiceService;

    @InjectMocks AppointmentService appointmentService;

    private final UUID DOCTOR_ID  = UUID.randomUUID();
    private final UUID PATIENT_ID = UUID.randomUUID();

    // patientId, doctorId, scheduledAt, durationMinutes, chiefComplaint, notes
    private AppointmentCreateRequest createRequest() {
        return new AppointmentCreateRequest(
            PATIENT_ID, DOCTOR_ID, OffsetDateTime.now().plusDays(1), 30, "Consulta general", null);
    }

    private Doctor activeDoctor() {
        Doctor d = new Doctor();
        d.setActive(true);
        return d;
    }

    // --- createAppointment ---

    @Test
    void createAppointment_whenDoctorNotFound_throwsEntityNotFoundException() {
        when(doctorRepository.findById(DOCTOR_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> appointmentService.createAppointment(createRequest()))
            .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void createAppointment_whenDoctorInactive_throwsBusinessRuleException() {
        Doctor inactiveDoctor = new Doctor();
        inactiveDoctor.setActive(false);

        when(doctorRepository.findById(DOCTOR_ID)).thenReturn(Optional.of(inactiveDoctor));

        assertThatThrownBy(() -> appointmentService.createAppointment(createRequest()))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("activo");
    }

    @Test
    void createAppointment_whenPatientNotFound_throwsEntityNotFoundException() {
        when(doctorRepository.findById(DOCTOR_ID)).thenReturn(Optional.of(activeDoctor()));
        when(patientRepository.existsById(PATIENT_ID)).thenReturn(false);

        assertThatThrownBy(() -> appointmentService.createAppointment(createRequest()))
            .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void createAppointment_whenScheduleConflict_throwsBusinessRuleException() {
        when(doctorRepository.findById(DOCTOR_ID)).thenReturn(Optional.of(activeDoctor()));
        when(patientRepository.existsById(PATIENT_ID)).thenReturn(true);
        when(appointmentRepository.hasScheduleConflict(any(), any(), any(), any())).thenReturn(true);

        assertThatThrownBy(() -> appointmentService.createAppointment(createRequest()))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("superpone");
    }

    @Test
    void createAppointment_success_setsStatusScheduledAndCalculatesEndTime() {
        OffsetDateTime scheduledAt = OffsetDateTime.now().plusDays(1);
        AppointmentCreateRequest req = new AppointmentCreateRequest(
            PATIENT_ID, DOCTOR_ID, scheduledAt, 45, null, null);

        Doctor doctor = activeDoctor();
        Patient patient = new Patient();
        Appointment appointment = new Appointment();
        AppointmentResponse expected = new AppointmentResponse(
            UUID.randomUUID(), PATIENT_ID, null, null, DOCTOR_ID, null, null,
            scheduledAt, scheduledAt.plusMinutes(45), 45, Status.SCHEDULED, null, null, null, null);

        when(doctorRepository.findById(DOCTOR_ID)).thenReturn(Optional.of(doctor));
        when(patientRepository.existsById(PATIENT_ID)).thenReturn(true);
        when(appointmentRepository.hasScheduleConflict(
            eq(DOCTOR_ID), eq(scheduledAt), eq(scheduledAt.plusMinutes(45)), any())).thenReturn(false);
        when(appointmentMapper.toEntity(req)).thenReturn(appointment);
        when(patientRepository.getReferenceById(PATIENT_ID)).thenReturn(patient);
        when(appointmentRepository.save(appointment)).thenReturn(appointment);
        when(appointmentMapper.toResponse(appointment)).thenReturn(expected);

        appointmentService.createAppointment(req);

        assertThat(appointment.getStatus()).isEqualTo(Status.SCHEDULED);
        assertThat(appointment.getScheduledEndAt()).isEqualTo(scheduledAt.plusMinutes(45));
        assertThat(appointment.getDoctor()).isEqualTo(doctor);
    }

    // --- confirmAppointment ---

    @Test
    void confirmAppointment_whenNotScheduled_throwsBusinessRuleException() {
        UUID id = UUID.randomUUID();
        Appointment appointment = new Appointment();
        appointment.setStatus(Status.CONFIRMED);

        when(appointmentRepository.findById(id)).thenReturn(Optional.of(appointment));

        assertThatThrownBy(() -> appointmentService.confirmAppointment(id))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("SCHEDULED");
    }

    @Test
    void confirmAppointment_success_setsStatusConfirmed() {
        UUID id = UUID.randomUUID();
        Appointment appointment = new Appointment();
        appointment.setStatus(Status.SCHEDULED);

        when(appointmentRepository.findById(id)).thenReturn(Optional.of(appointment));
        when(appointmentRepository.save(appointment)).thenReturn(appointment);
        when(appointmentMapper.toResponse(appointment)).thenReturn(null);

        appointmentService.confirmAppointment(id);

        assertThat(appointment.getStatus()).isEqualTo(Status.CONFIRMED);
    }

    // --- startAppointment ---

    @Test
    void startAppointment_whenNotConfirmed_throwsBusinessRuleException() {
        UUID id = UUID.randomUUID();
        Appointment appointment = new Appointment();
        appointment.setStatus(Status.SCHEDULED);

        when(appointmentRepository.findById(id)).thenReturn(Optional.of(appointment));

        assertThatThrownBy(() -> appointmentService.startAppointment(id))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("CONFIRMED");
    }

    @Test
    void startAppointment_success_setsStatusInProgress() {
        UUID id = UUID.randomUUID();
        Appointment appointment = new Appointment();
        appointment.setStatus(Status.CONFIRMED);

        when(appointmentRepository.findById(id)).thenReturn(Optional.of(appointment));
        when(appointmentRepository.save(appointment)).thenReturn(appointment);
        when(appointmentMapper.toResponse(appointment)).thenReturn(null);

        appointmentService.startAppointment(id);

        assertThat(appointment.getStatus()).isEqualTo(Status.IN_PROGRESS);
    }

    // --- completeAppointment ---

    @Test
    void completeAppointment_whenNotInProgress_throwsBusinessRuleException() {
        UUID id = UUID.randomUUID();
        Appointment appointment = new Appointment();
        appointment.setStatus(Status.CONFIRMED);

        when(appointmentRepository.findById(id)).thenReturn(Optional.of(appointment));

        assertThatThrownBy(() -> appointmentService.completeAppointment(id, null))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("IN_PROGRESS");
    }

    @Test
    void completeAppointment_success_createsMedicalRecordAndDraftInvoice() {
        UUID id = UUID.randomUUID();
        Patient patient = new Patient();
        Appointment appointment = new Appointment();
        appointment.setStatus(Status.IN_PROGRESS);
        appointment.setPatient(patient);

        // patientId, appointmentId, vitalSigns, physicalExam, clinicalNotes, recordDate
        MedicalRecordCreateRequest mrRequest = new MedicalRecordCreateRequest(
            null, null, null, null, "Evolución favorable", OffsetDateTime.now());

        MedicalRecord medicalRecord = new MedicalRecord();

        when(appointmentRepository.findById(id)).thenReturn(Optional.of(appointment));
        when(medicalRecordMapper.toEntity(mrRequest)).thenReturn(medicalRecord);
        when(medicalRecordRepository.save(medicalRecord)).thenReturn(medicalRecord);
        when(appointmentRepository.save(appointment)).thenReturn(appointment);
        when(appointmentMapper.toResponse(appointment)).thenReturn(null);

        appointmentService.completeAppointment(id, mrRequest);

        assertThat(appointment.getStatus()).isEqualTo(Status.COMPLETED);
        verify(medicalRecordRepository).save(medicalRecord);
        verify(invoiceService).createDraftInvoice(appointment);
        assertThat(medicalRecord.getAppointment()).isEqualTo(appointment);
        assertThat(medicalRecord.getPatient()).isEqualTo(patient);
    }

    // --- cancelAppointment ---

    @Test
    void cancelAppointment_whenInProgress_throwsBusinessRuleException() {
        UUID id = UUID.randomUUID();
        Appointment appointment = new Appointment();
        appointment.setStatus(Status.IN_PROGRESS);

        when(appointmentRepository.findById(id)).thenReturn(Optional.of(appointment));

        assertThatThrownBy(() -> appointmentService.cancelAppointment(id))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("SCHEDULED");
    }

    @Test
    void cancelAppointment_whenScheduled_setsStatusCancelled() {
        UUID id = UUID.randomUUID();
        Appointment appointment = new Appointment();
        appointment.setStatus(Status.SCHEDULED);

        when(appointmentRepository.findById(id)).thenReturn(Optional.of(appointment));
        when(appointmentRepository.save(appointment)).thenReturn(appointment);
        when(appointmentMapper.toResponse(appointment)).thenReturn(null);

        appointmentService.cancelAppointment(id);

        assertThat(appointment.getStatus()).isEqualTo(Status.CANCELLED);
    }

    // --- markNoShow ---

    @Test
    void markNoShow_whenScheduled_throwsBusinessRuleException() {
        UUID id = UUID.randomUUID();
        Appointment appointment = new Appointment();
        appointment.setStatus(Status.SCHEDULED);

        when(appointmentRepository.findById(id)).thenReturn(Optional.of(appointment));

        assertThatThrownBy(() -> appointmentService.markNoShow(id))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("IN_PROGRESS");
    }

    @Test
    void markNoShow_whenInProgress_setsStatusNoShow() {
        UUID id = UUID.randomUUID();
        Appointment appointment = new Appointment();
        appointment.setStatus(Status.IN_PROGRESS);

        when(appointmentRepository.findById(id)).thenReturn(Optional.of(appointment));
        when(appointmentRepository.save(appointment)).thenReturn(appointment);
        when(appointmentMapper.toResponse(appointment)).thenReturn(null);

        appointmentService.markNoShow(id);

        assertThat(appointment.getStatus()).isEqualTo(Status.NO_SHOW);
    }
}
