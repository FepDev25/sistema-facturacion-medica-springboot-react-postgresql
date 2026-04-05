package com.fepdev.sfm.backend.domain.insurance;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fepdev.sfm.backend.domain.insurance.dto.InsurancePolicyCreateRequest;
import com.fepdev.sfm.backend.domain.insurance.dto.InsurancePolicyResponse;
import com.fepdev.sfm.backend.domain.insurance.dto.InsurancePolicyUpdateRequest;
import com.fepdev.sfm.backend.domain.insurance.dto.InsuranceProviderCreateRequest;
import com.fepdev.sfm.backend.domain.insurance.dto.InsuranceProviderResponse;
import com.fepdev.sfm.backend.domain.insurance.dto.InsuranceProviderUpdateRequest;
import com.fepdev.sfm.backend.domain.patient.PatientRepository;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@Service
public class InsuranceService {
    
    private final InsuranceProviderRepository providerRepo;
    private final InsurancePolicyRepository policyRepo;
    private final InsurancePolicyMapper policyMapper;
    private final InsuranceProviderMapper providerMapper;
    private final PatientRepository patientRepo;

    public InsuranceService(InsuranceProviderRepository providerRepo, InsurancePolicyRepository policyRepo,
            InsurancePolicyMapper policyMapper, InsuranceProviderMapper providerMapper, PatientRepository patientRepo) {
        this.providerRepo = providerRepo;
        this.policyRepo = policyRepo;
        this.policyMapper = policyMapper;
        this.providerMapper = providerMapper;
        this.patientRepo = patientRepo;
    }

    // *** Insurance Provider Management ***

    // crear nuevo proveedor de seguro
    @CacheEvict(value = "insurance-providers", allEntries = true)
    @Transactional
    public InsuranceProviderResponse createProvider(InsuranceProviderCreateRequest request) {

        if (providerRepo.existsByCode(request.code())) {
            throw new BusinessRuleException("El código: " + request.code() + " ya está en uso por otro proveedor");
        }

        InsuranceProvider provider = providerMapper.toEntity(request);
        provider.setActive(true); // por defecto activo
        provider = providerRepo.save(provider);
        return providerMapper.toResponse(provider);
    }

    // actualizar proveedor de seguro
    @CacheEvict(value = "insurance-providers", allEntries = true)
    @Transactional
    public InsuranceProviderResponse updateProvider(UUID id, InsuranceProviderUpdateRequest request) {
        
        InsuranceProvider provider = providerRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Proveedor con ID: " + id + " no encontrado"));

        providerMapper.updateEntity(request, provider);
        provider = providerRepo.save(provider);
        return providerMapper.toResponse(provider);
    }

    // desactivar proveedor de seguro, solo si no tiene pólizas activas
    @CacheEvict(value = "insurance-providers", allEntries = true)
    @Transactional
    public void deactivateProvider(UUID id) {

        InsuranceProvider provider = providerRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Proveedor con ID: " + id + " no encontrado"));

        if (policyRepo.existsActiveByProviderId(id)) {
            throw new BusinessRuleException("No se puede desactivar el proveedor porque tiene pólizas activas");
        }

        provider.setActive(false);
        providerRepo.save(provider);
    }

    // listar proveedores de seguro con filtros opcionales
    @Transactional(readOnly = true)
    public Page<InsuranceProviderResponse> listProviders(Boolean isActive, Pageable pageable) {
        return providerRepo.findWithFilters(isActive, pageable)
                .map(providerMapper::toResponse);
    }

    // adicional: obtener detalles de un proveedor por ID
    @Cacheable(value = "insurance-providers", key = "'id-' + #id")
    @Transactional(readOnly = true)
    public InsuranceProviderResponse getProviderById(UUID id) {
        InsuranceProvider provider = providerRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Proveedor con ID: " + id + " no encontrado"));
        return providerMapper.toResponse(provider);
    }

    // *** Insurance Policy Management ***

    // crear nueva póliza de seguro para un paciente, validando que el proveedor exista y esté activo
    @Transactional
    public InsurancePolicyResponse createPolicy(InsurancePolicyCreateRequest request) {

        InsuranceProvider provider = providerRepo.findById(request.providerId())
                .orElseThrow(() -> new EntityNotFoundException("Proveedor con ID: " + request.providerId() + " no encontrado"));
        if (!provider.isActive()) {
            throw new BusinessRuleException("No se puede asignar una póliza a un proveedor inactivo");
        }

        var patient = patientRepo.findById(request.patientId())
                .orElseThrow(() -> new EntityNotFoundException("Paciente con ID: " + request.patientId() + " no encontrado"));

        // validar que la fecha de fin sea posterior a la fecha de inicio
        if (request.endDate().isBefore(request.startDate()) || request.endDate().isEqual(request.startDate())) {
            throw new BusinessRuleException("La fecha de fin de la póliza debe ser estrictamente posterior a la fecha de inicio.");
        }

        InsurancePolicy policy = policyMapper.toEntity(request);
        policy.setPatient(patient);
        policy.setProvider(provider);
        policy.setActive(true);

        return policyMapper.toResponse(policyRepo.save(policy));
    }

    // actualizar datos modificables de una póliza (no cambia paciente ni proveedor ni número)
    @Transactional
    public InsurancePolicyResponse updatePolicy(UUID id, InsurancePolicyUpdateRequest request) {

        InsurancePolicy policy = policyRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Póliza con ID: " + id + " no encontrada"));

        // validar que la fecha de fin sea posterior a la fecha de inicio, considerando los valores nuevos o actuales
        LocalDate newStartDate = request.startDate() != null ? request.startDate() : policy.getStartDate();
        LocalDate newEndDate = request.endDate() != null ? request.endDate() : policy.getEndDate();
        if (newEndDate.isBefore(newStartDate) || newEndDate.isEqual(newStartDate)) {
            throw new BusinessRuleException("La fecha de fin de la póliza debe ser estrictamente posterior a la fecha de inicio.");
        }

        policyMapper.updateEntity(request, policy);
        return policyMapper.toResponse(policyRepo.save(policy));
    }

    // obtener detalles de una póliza por ID
    @Transactional(readOnly = true)
    public InsurancePolicyResponse getPolicyById(UUID id) {
        InsurancePolicy policy = policyRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Póliza con ID: " + id + " no encontrada"));
        return policyMapper.toResponse(policy);
    }

    // obtener detalles de una póliza por número de póliza
    @Transactional(readOnly = true)
    public InsurancePolicyResponse getPolicyByNumber(String policyNumber) {
        InsurancePolicy policy = policyRepo.findByPolicyNumber(policyNumber)
                .orElseThrow(() -> new EntityNotFoundException("Póliza con número: " + policyNumber + " no encontrada"));
        return policyMapper.toResponse(policy);
    }

    // listar pólizas de seguro de un paciente, con opción de filtrar solo las activas
    @Transactional(readOnly = true)
    public Page<InsurancePolicyResponse> listPoliciesByPatient(UUID patientId, Boolean onlyActive, Pageable pageable) {
        if (patientId == null) {
            return policyRepo.findAllWithFilter(onlyActive, pageable)
                    .map(policyMapper::toResponse);
        }

        return policyRepo.findByPatientIdWithFilter(patientId, onlyActive, pageable)
                         .map(policyMapper::toResponse);
    }

}
