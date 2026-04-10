package com.fepdev.sfm.backend.domain.doctor;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fepdev.sfm.backend.domain.appointment.AppointmentMapper;
import com.fepdev.sfm.backend.domain.appointment.AppointmentRepository;
import com.fepdev.sfm.backend.domain.doctor.dto.DoctorCreateRequest;
import com.fepdev.sfm.backend.domain.doctor.dto.DoctorResponse;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
class DoctorServiceTest {

    @Mock DoctorRepository doctorRepository;
    @Mock DoctorMapper doctorMapper;
    @Mock AppointmentRepository appointmentRepository;
    @Mock AppointmentMapper appointmentMapper;
    @Mock com.fepdev.sfm.backend.security.SystemUserRepository systemUserRepository;

    @InjectMocks DoctorService doctorService;

    private DoctorCreateRequest request(String license) {
        return new DoctorCreateRequest(license, "Carlos", "López", "Cardiología", "555-1234", "c@example.com", null);
    }

    @Test
    void createDoctor_whenLicenseAlreadyExists_throwsBusinessRuleException() {
        when(doctorRepository.existsByLicenseNumber("LIC-001")).thenReturn(true);

        assertThatThrownBy(() -> doctorService.createDoctor(request("LIC-001")))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("LIC-001");

        verify(doctorRepository, never()).save(any());
    }

    @Test
    void createDoctor_success_savesWithActiveTrueAndReturnsResponse() {
        DoctorCreateRequest req = request("LIC-002");
        Doctor doctor = new Doctor();
        DoctorResponse expected = new DoctorResponse(
            UUID.randomUUID(), "LIC-002", "Carlos", "López", "Cardiología", "555-1234", "c@example.com", true, null, null, null, null);

        when(doctorRepository.existsByLicenseNumber("LIC-002")).thenReturn(false);
        when(doctorMapper.toEntity(req)).thenReturn(doctor);
        when(doctorRepository.save(doctor)).thenReturn(doctor);
        when(doctorMapper.toResponse(doctor)).thenReturn(expected);

        DoctorResponse result = doctorService.createDoctor(req);

        assertThat(result).isEqualTo(expected);

        ArgumentCaptor<Doctor> captor = ArgumentCaptor.forClass(Doctor.class);
        verify(doctorRepository).save(captor.capture());
        assertThat(captor.getValue().isActive()).isTrue();
    }

    @Test
    void deactivateDoctor_whenNotFound_throwsEntityNotFoundException() {
        UUID id = UUID.randomUUID();
        when(doctorRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> doctorService.deactivateDoctor(id))
            .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void deactivateDoctor_success_setsActiveFalse() {
        UUID id = UUID.randomUUID();
        Doctor doctor = new Doctor();
        doctor.setActive(true);

        when(doctorRepository.findById(id)).thenReturn(Optional.of(doctor));
        when(doctorRepository.save(doctor)).thenReturn(doctor);

        doctorService.deactivateDoctor(id);

        assertThat(doctor.isActive()).isFalse();
        verify(doctorRepository).save(doctor);
    }

    @Test
    void getDoctorById_whenNotFound_throwsEntityNotFoundException() {
        UUID id = UUID.randomUUID();
        when(doctorRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> doctorService.getDoctorById(id))
            .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void getDoctorByLicenseNumber_whenNotFound_throwsEntityNotFoundException() {
        when(doctorRepository.findByLicenseNumber("X-999")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> doctorService.getDoctorByLicenseNumber("X-999"))
            .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void getAppointmentsByDoctorId_whenDoctorNotFound_throwsEntityNotFoundException() {
        UUID doctorId = UUID.randomUUID();
        when(doctorRepository.existsById(doctorId)).thenReturn(false);

        assertThatThrownBy(() -> doctorService.getAppointmentsByDoctorId(doctorId, null, null, null))
            .isInstanceOf(EntityNotFoundException.class);
    }
}
