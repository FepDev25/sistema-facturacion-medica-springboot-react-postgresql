package com.fepdev.sfm.backend.domain.insurance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fepdev.sfm.backend.domain.insurance.dto.InsurancePolicyCreateRequest;
import com.fepdev.sfm.backend.domain.insurance.dto.InsurancePolicyUpdateRequest;
import com.fepdev.sfm.backend.domain.insurance.dto.InsuranceProviderCreateRequest;
import com.fepdev.sfm.backend.domain.insurance.dto.InsuranceProviderResponse;
import com.fepdev.sfm.backend.domain.patient.Patient;
import com.fepdev.sfm.backend.domain.patient.PatientRepository;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
class InsuranceServiceTest {

    @Mock InsuranceProviderRepository providerRepo;
    @Mock InsurancePolicyRepository policyRepo;
    @Mock InsurancePolicyMapper policyMapper;
    @Mock InsuranceProviderMapper providerMapper;
    @Mock PatientRepository patientRepo;

    @InjectMocks InsuranceService insuranceService;

    // name, code, phone, email, address
    private InsuranceProviderCreateRequest providerRequest(String code) {
        return new InsuranceProviderCreateRequest("Seguro Nacional", code, "555-9000", "info@seg.com", null);
    }

    // patientId, providerId, policyNumber, coveragePercentage, deductible, startDate, endDate
    private InsurancePolicyCreateRequest policyRequest(UUID providerId, UUID patientId, LocalDate start, LocalDate end) {
        return new InsurancePolicyCreateRequest(
            patientId, providerId, "POL-001", new BigDecimal("80.00"), BigDecimal.ZERO, start, end);
    }

    // --- Provider tests ---

    @Test
    void createProvider_whenCodeAlreadyExists_throwsBusinessRuleException() {
        when(providerRepo.existsByCode("PROV-01")).thenReturn(true);

        assertThatThrownBy(() -> insuranceService.createProvider(providerRequest("PROV-01")))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("PROV-01");

        verify(providerRepo, never()).save(any());
    }

    @Test
    void createProvider_success_savesWithActiveTrueAndReturnsResponse() {
        InsuranceProviderCreateRequest req = providerRequest("PROV-02");
        InsuranceProvider provider = new InsuranceProvider();
        InsuranceProviderResponse expected = new InsuranceProviderResponse(
            UUID.randomUUID(), "Seguro Nacional", "PROV-02", "555-9000", null, null, true, null, null);

        when(providerRepo.existsByCode("PROV-02")).thenReturn(false);
        when(providerMapper.toEntity(req)).thenReturn(provider);
        when(providerRepo.save(provider)).thenReturn(provider);
        when(providerMapper.toResponse(provider)).thenReturn(expected);

        InsuranceProviderResponse result = insuranceService.createProvider(req);

        assertThat(result).isEqualTo(expected);

        ArgumentCaptor<InsuranceProvider> captor = ArgumentCaptor.forClass(InsuranceProvider.class);
        verify(providerRepo).save(captor.capture());
        assertThat(captor.getValue().isActive()).isTrue();
    }

    @Test
    void deactivateProvider_whenHasActivePolicies_throwsBusinessRuleException() {
        UUID providerId = UUID.randomUUID();
        InsuranceProvider provider = new InsuranceProvider();
        provider.setActive(true);

        when(providerRepo.findById(providerId)).thenReturn(Optional.of(provider));
        when(policyRepo.existsActiveByProviderId(providerId)).thenReturn(true);

        assertThatThrownBy(() -> insuranceService.deactivateProvider(providerId))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("pólizas activas");
    }

    @Test
    void deactivateProvider_success_setsActiveFalse() {
        UUID providerId = UUID.randomUUID();
        InsuranceProvider provider = new InsuranceProvider();
        provider.setActive(true);

        when(providerRepo.findById(providerId)).thenReturn(Optional.of(provider));
        when(policyRepo.existsActiveByProviderId(providerId)).thenReturn(false);
        when(providerRepo.save(provider)).thenReturn(provider);

        insuranceService.deactivateProvider(providerId);

        assertThat(provider.isActive()).isFalse();
        verify(providerRepo).save(provider);
    }

    // --- Policy tests ---

    @Test
    void createPolicy_whenProviderNotFound_throwsEntityNotFoundException() {
        UUID providerId = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();

        when(providerRepo.findById(providerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> insuranceService.createPolicy(
                policyRequest(providerId, patientId, LocalDate.now(), LocalDate.now().plusYears(1))))
            .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void createPolicy_whenProviderInactive_throwsBusinessRuleException() {
        UUID providerId = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();
        InsuranceProvider inactiveProvider = new InsuranceProvider();
        inactiveProvider.setActive(false);

        when(providerRepo.findById(providerId)).thenReturn(Optional.of(inactiveProvider));

        assertThatThrownBy(() -> insuranceService.createPolicy(
                policyRequest(providerId, patientId, LocalDate.now(), LocalDate.now().plusYears(1))))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("inactivo");
    }

    @Test
    void createPolicy_whenPatientNotFound_throwsEntityNotFoundException() {
        UUID providerId = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();
        InsuranceProvider activeProvider = new InsuranceProvider();
        activeProvider.setActive(true);

        when(providerRepo.findById(providerId)).thenReturn(Optional.of(activeProvider));
        when(patientRepo.findById(patientId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> insuranceService.createPolicy(
                policyRequest(providerId, patientId, LocalDate.now(), LocalDate.now().plusYears(1))))
            .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void createPolicy_whenEndDateEqualsStartDate_throwsBusinessRuleException() {
        UUID providerId = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();
        LocalDate today = LocalDate.now();
        InsuranceProvider activeProvider = new InsuranceProvider();
        activeProvider.setActive(true);
        Patient patient = new Patient();

        when(providerRepo.findById(providerId)).thenReturn(Optional.of(activeProvider));
        when(patientRepo.findById(patientId)).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> insuranceService.createPolicy(
                policyRequest(providerId, patientId, today, today)))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("posterior");
    }

    @Test
    void createPolicy_whenEndDateBeforeStartDate_throwsBusinessRuleException() {
        UUID providerId = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();
        InsuranceProvider activeProvider = new InsuranceProvider();
        activeProvider.setActive(true);
        Patient patient = new Patient();

        when(providerRepo.findById(providerId)).thenReturn(Optional.of(activeProvider));
        when(patientRepo.findById(patientId)).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> insuranceService.createPolicy(
                policyRequest(providerId, patientId, LocalDate.now(), LocalDate.now().minusDays(1))))
            .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void createPolicy_success() {
        UUID providerId = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();
        InsuranceProvider activeProvider = new InsuranceProvider();
        activeProvider.setActive(true);
        Patient patient = new Patient();
        InsurancePolicy policy = new InsurancePolicy();
        InsurancePolicyCreateRequest req = policyRequest(
            providerId, patientId, LocalDate.now(), LocalDate.now().plusYears(1));

        when(providerRepo.findById(providerId)).thenReturn(Optional.of(activeProvider));
        when(patientRepo.findById(patientId)).thenReturn(Optional.of(patient));
        when(policyMapper.toEntity(req)).thenReturn(policy);
        when(policyRepo.save(policy)).thenReturn(policy);
        when(policyMapper.toResponse(policy)).thenReturn(null);

        insuranceService.createPolicy(req);

        verify(policyRepo).save(policy);
        assertThat(policy.isActive()).isTrue();
        assertThat(policy.getProvider()).isEqualTo(activeProvider);
        assertThat(policy.getPatient()).isEqualTo(patient);
    }

    @Test
    void updatePolicy_whenEndDateEqualsStartDate_throwsBusinessRuleException() {
        UUID policyId = UUID.randomUUID();
        LocalDate today = LocalDate.now();
        InsurancePolicy existing = new InsurancePolicy();
        existing.setStartDate(today);
        existing.setEndDate(today.plusYears(1));

        // request sets new endDate = startDate → invalid
        InsurancePolicyUpdateRequest req = new InsurancePolicyUpdateRequest(
            new BigDecimal("50.00"), null, null, today, null);

        when(policyRepo.findById(policyId)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> insuranceService.updatePolicy(policyId, req))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("posterior");
    }

    @Test
    void updatePolicy_whenEndDateBeforeStartDate_throwsBusinessRuleException() {
        UUID policyId = UUID.randomUUID();
        LocalDate today = LocalDate.now();
        InsurancePolicy existing = new InsurancePolicy();
        existing.setStartDate(today);
        existing.setEndDate(today.plusYears(1));

        InsurancePolicyUpdateRequest req = new InsurancePolicyUpdateRequest(
            new BigDecimal("50.00"), null, null, today.minusDays(1), null);

        when(policyRepo.findById(policyId)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> insuranceService.updatePolicy(policyId, req))
            .isInstanceOf(BusinessRuleException.class);
    }
}
