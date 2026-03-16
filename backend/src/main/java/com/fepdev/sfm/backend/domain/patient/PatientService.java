package com.fepdev.sfm.backend.domain.patient;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fepdev.sfm.backend.domain.appointment.AppointmentMapper;
import com.fepdev.sfm.backend.domain.appointment.AppointmentRepository;
import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentSummaryResponse;
import com.fepdev.sfm.backend.domain.insurance.InsurancePolicyMapper;
import com.fepdev.sfm.backend.domain.insurance.InsurancePolicyRepository;
import com.fepdev.sfm.backend.domain.insurance.dto.InsurancePolicySummaryResponse;
import com.fepdev.sfm.backend.domain.patient.dto.PatientCreateRequest;
import com.fepdev.sfm.backend.domain.patient.dto.PatientResponse;
import com.fepdev.sfm.backend.domain.patient.dto.PatientSummaryResponse;
import com.fepdev.sfm.backend.domain.patient.dto.PatientUpdateRequest;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@Service
public class PatientService {

    private final PatientRepository patientRepository;
    private final PatientMapper patientMapper;

    private final AppointmentRepository appointmentRepository;
    private final AppointmentMapper appointmentMapper;

    private final InsurancePolicyRepository insurancePolicyRepository;
    private final InsurancePolicyMapper insurancePolicyMapper;

    public PatientService(PatientRepository patientRepository, PatientMapper patientMapper, 
        AppointmentRepository appointmentRepository, InsurancePolicyRepository insurancePolicyRepository, 
        InsurancePolicyMapper insurancePolicyMapper, AppointmentMapper appointmentMapper) {

        this.patientRepository = patientRepository;
        this.patientMapper = patientMapper;
        this.appointmentRepository = appointmentRepository;
        this.insurancePolicyRepository = insurancePolicyRepository;
        this.insurancePolicyMapper = insurancePolicyMapper;
        this.appointmentMapper = appointmentMapper;
    }

    // crear un nuevo paciente, si el DNI ya existe, lanzar una excepción de regla de negocio
    @Transactional
    public PatientResponse createPatient(PatientCreateRequest request){

        if (request.dni() != null && patientRepository.existsByDni(request.dni())) {
            throw new BusinessRuleException("El DNI " + request.dni() + " ya se encuentra registrado en el sistema.");
        }

        Patient patient = patientMapper.toEntity(request);

        Patient savedPatient = patientRepository.save(patient);
        return patientMapper.toResponse(savedPatient);
    }

    // actualizar un paciente existente, si el paciente no existe, lanzar una excepción de regla de negocio
    @Transactional
    public PatientResponse updatePatient(UUID id, PatientUpdateRequest request){
        Patient entity = patientRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Paciente con ID " + id + " no encontrado."));

        patientMapper.updateEntity(request, entity);

        Patient updatedPatient = patientRepository.save(entity);
        return patientMapper.toResponse(updatedPatient);
    }

    // obtener un paciente por ID, si el paciente no existe, lanzar una excepción de regla de negocio
    @Transactional(readOnly = true)
    public PatientResponse getPatientById(UUID id){
        Patient patient = patientRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Paciente con ID " + id + " no encontrado."));
        return patientMapper.toResponse(patient);
    }

    // obtener un paciente por DNI, si el paciente no existe, lanzar una excepción de regla de negocio
    @Transactional(readOnly = true)
    public PatientResponse getPatientByDni(String dni){
        Patient patient = patientRepository.findByDni(dni)
            .orElseThrow(() -> new EntityNotFoundException("Paciente con DNI " + dni + " no encontrado."));
        return patientMapper.toResponse(patient);
    }

    // listar pacientes con filtro por apellido y paginacion
    @Transactional(readOnly = true)
    public Page<PatientSummaryResponse> listPatients(String lastName, Pageable pageable){
        Page<Patient> patients = patientRepository.findWithFilters(lastName, pageable);
        return patients.map(patientMapper::toSummaryResponse);
    }

    // busqueda rapida por nombre, apellido o dni
    @Transactional(readOnly = true)
    public List<PatientSummaryResponse> autocomplete(String searchTerm) {
        if (searchTerm == null || searchTerm.trim().length() < 2) {
            return Collections.emptyList(); //si hay menos de 2 letras, no se busca nada
        }
        
        // limitamos a los 10 primeros resultados para no sobrecargar la respuesta
        Pageable limit = PageRequest.of(0, 10);
        List<Patient> entities = patientRepository.quickSearch(searchTerm.trim(), limit);
        return patientMapper.toSummaryResponseList(entities);
    }

    // historial de citas
    @Transactional(readOnly = true)
    public Page<AppointmentSummaryResponse> getPatientAppointments(UUID patientId, Pageable pageable) {
        patientRepository.findById(patientId)
            .orElseThrow(() -> new EntityNotFoundException("Paciente no encontrado"));
        return appointmentRepository.findByPatientId(patientId, pageable)
            .map(appointmentMapper::toSummaryResponse);
    }

    // obtener las pólizas de un paciente con paginación y filtro de activas
    @Transactional(readOnly = true)
    public Page<InsurancePolicySummaryResponse> getPatientPolicies(UUID patientId, Boolean onlyActive, Pageable pageable) {
        
        if (!patientRepository.existsById(patientId)) {
            throw new EntityNotFoundException("Paciente con ID " + patientId + " no encontrado.");
        }

        return insurancePolicyRepository.findByPatientIdWithFilter(patientId, onlyActive, pageable)
            .map(insurancePolicyMapper::toSummaryResponse);
    }
}
