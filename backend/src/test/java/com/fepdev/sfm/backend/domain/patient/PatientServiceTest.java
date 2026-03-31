package com.fepdev.sfm.backend.domain.patient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.fepdev.sfm.backend.domain.appointment.AppointmentMapper;
import com.fepdev.sfm.backend.domain.appointment.AppointmentRepository;
import com.fepdev.sfm.backend.domain.insurance.InsurancePolicyMapper;
import com.fepdev.sfm.backend.domain.insurance.InsurancePolicyRepository;
import com.fepdev.sfm.backend.domain.patient.dto.PatientCreateRequest;
import com.fepdev.sfm.backend.domain.patient.dto.PatientResponse;
import com.fepdev.sfm.backend.domain.patient.dto.PatientSummaryResponse;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
class PatientServiceTest {

    @Mock PatientRepository patientRepository;
    @Mock PatientMapper patientMapper;
    @Mock AppointmentRepository appointmentRepository;
    @Mock AppointmentMapper appointmentMapper;
    @Mock InsurancePolicyRepository insurancePolicyRepository;
    @Mock InsurancePolicyMapper insurancePolicyMapper;

    @InjectMocks PatientService patientService;

    // dni, firstName, lastName, birthDate, gender, phone, email, address, bloodType, allergies
    private PatientCreateRequest requestWith(String dni) {
        return new PatientCreateRequest(dni, "Juan", "Pérez", null, null, null, null, null, null, null);
    }

    @Test
    void createPatient_whenDniAlreadyExists_throwsBusinessRuleException() {
        when(patientRepository.existsByDni("12345678")).thenReturn(true);

        assertThatThrownBy(() -> patientService.createPatient(requestWith("12345678")))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("12345678");

        verify(patientRepository, never()).save(any());
    }

    @Test
    void createPatient_whenDniIsNull_doesNotCheckDuplicate() {
        PatientCreateRequest request = requestWith(null);
        Patient patient = new Patient();
        PatientResponse expected = new PatientResponse(
            UUID.randomUUID(), null, "Juan", "Pérez", null, null, null, null, null, null, null, null, null);

        when(patientMapper.toEntity(request)).thenReturn(patient);
        when(patientRepository.save(patient)).thenReturn(patient);
        when(patientMapper.toResponse(patient)).thenReturn(expected);

        PatientResponse result = patientService.createPatient(request);

        assertThat(result).isEqualTo(expected);
        verify(patientRepository, never()).existsByDni(any());
    }

    @Test
    void createPatient_success() {
        PatientCreateRequest request = requestWith("87654321");
        Patient patient = new Patient();
        PatientResponse expected = new PatientResponse(
            UUID.randomUUID(), "87654321", "Juan", "Pérez", null, null, null, null, null, null, null, null, null);

        when(patientRepository.existsByDni("87654321")).thenReturn(false);
        when(patientMapper.toEntity(request)).thenReturn(patient);
        when(patientRepository.save(patient)).thenReturn(patient);
        when(patientMapper.toResponse(patient)).thenReturn(expected);

        PatientResponse result = patientService.createPatient(request);

        assertThat(result).isEqualTo(expected);
    }

    @Test
    void getPatientById_whenNotFound_throwsEntityNotFoundException() {
        UUID id = UUID.randomUUID();
        when(patientRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> patientService.getPatientById(id))
            .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void updatePatient_whenNotFound_throwsEntityNotFoundException() {
        UUID id = UUID.randomUUID();
        when(patientRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> patientService.updatePatient(id, null))
            .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void autocomplete_whenTermIsNull_returnsEmptyListWithoutQueryingRepository() {
        List<PatientSummaryResponse> result = patientService.autocomplete(null);

        assertThat(result).isEmpty();
        verify(patientRepository, never()).quickSearch(any(), any());
    }

    @Test
    void autocomplete_whenTermIsSingleChar_returnsEmptyList() {
        List<PatientSummaryResponse> result = patientService.autocomplete("A");

        assertThat(result).isEmpty();
        verify(patientRepository, never()).quickSearch(any(), any());
    }

    @Test
    void autocomplete_whenTermHasTwoOrMoreChars_queriesRepositoryLimitedTo10() {
        Patient p1 = new Patient();
        Patient p2 = new Patient();
        PatientSummaryResponse s1 = new PatientSummaryResponse(UUID.randomUUID(), "1", "Juan", "Pérez", null);
        PatientSummaryResponse s2 = new PatientSummaryResponse(UUID.randomUUID(), "2", "Ana", "García", null);

        when(patientRepository.quickSearch("Ju", PageRequest.of(0, 10))).thenReturn(List.of(p1, p2));
        when(patientMapper.toSummaryResponseList(List.of(p1, p2))).thenReturn(List.of(s1, s2));

        List<PatientSummaryResponse> result = patientService.autocomplete("Ju");

        assertThat(result).hasSize(2);
    }

    @Test
    void getPatientPolicies_whenPatientNotFound_throwsEntityNotFoundException() {
        UUID patientId = UUID.randomUUID();
        when(patientRepository.existsById(patientId)).thenReturn(false);

        assertThatThrownBy(() -> patientService.getPatientPolicies(patientId, true, Pageable.unpaged()))
            .isInstanceOf(EntityNotFoundException.class);
    }
}
