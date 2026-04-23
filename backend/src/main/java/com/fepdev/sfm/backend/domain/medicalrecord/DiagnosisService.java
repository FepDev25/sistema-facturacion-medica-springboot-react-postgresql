package com.fepdev.sfm.backend.domain.medicalrecord;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fepdev.sfm.backend.ai.history.PatientHistoryIndexer;
import com.fepdev.sfm.backend.domain.appointment.Appointment;
import com.fepdev.sfm.backend.domain.appointment.Status;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.DiagnosisCreateRequest;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.DiagnosisResponse;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@Service
public class DiagnosisService {

    private final DiagnosisRepository diagnosisRepository;
    private final DiagnosisMapper diagnosisMapper;
    private final MedicalRecordRepository medicalRecordRepository;
    private final PatientHistoryIndexer historyIndexer;

    public DiagnosisService(DiagnosisRepository diagnosisRepository, DiagnosisMapper diagnosisMapper,
            MedicalRecordRepository medicalRecordRepository, PatientHistoryIndexer historyIndexer) {
        this.diagnosisRepository = diagnosisRepository;
        this.diagnosisMapper = diagnosisMapper;
        this.medicalRecordRepository = medicalRecordRepository;
        this.historyIndexer = historyIndexer;
    }

    // agregar diagnóstico a un expediente existente
    @Transactional
    public DiagnosisResponse addDiagnosis(DiagnosisCreateRequest request) {

        // cargar el expediente
        MedicalRecord medicalRecord = medicalRecordRepository.findById(request.medicalRecordId())
                .orElseThrow(() -> new EntityNotFoundException("Expediente con ID: " + request.medicalRecordId() + " no encontrado"));

        // validar que appointmentId y medicalRecordId pertenecen a la misma consulta
        if (!medicalRecord.getAppointment().getId().equals(request.appointmentId())) {
            throw new BusinessRuleException("El appointment_id y el medical_record_id no pertenecen a la misma consulta");
        }

        Appointment appointment = medicalRecord.getAppointment();

        // solo se pueden agregar diagnósticos a citas en progreso o completadas
        if (appointment.getStatus() != Status.IN_PROGRESS && appointment.getStatus() != Status.COMPLETED) {
            throw new BusinessRuleException(
                    "Solo se pueden agregar diagnósticos a citas en estado IN_PROGRESS o COMPLETED. Estado actual: "
                            + appointment.getStatus());
        }

        Diagnosis diagnosis = diagnosisMapper.toEntity(request);
        diagnosis.setAppointment(appointment);
        diagnosis.setMedicalRecord(medicalRecord);

        DiagnosisResponse response = diagnosisMapper.toResponse(diagnosisRepository.save(diagnosis));
        historyIndexer.scheduleReindex(medicalRecord.getId());
        return response;
    }

    // listar diagnósticos de un expediente clínico
    @Transactional(readOnly = true)
    public Page<DiagnosisResponse> getDiagnosesByMedicalRecord(UUID medicalRecordId, Pageable pageable) {
        if (!medicalRecordRepository.existsById(medicalRecordId)) {
            throw new EntityNotFoundException("Expediente con ID: " + medicalRecordId + " no encontrado");
        }
        return diagnosisRepository.findByMedicalRecordId(medicalRecordId, pageable)
                .map(diagnosisMapper::toResponse);
    }

    // buscar diagnósticos por código ICD-10 (para reportería)
    @Transactional(readOnly = true)
    public Page<DiagnosisResponse> getDiagnosesByIcd10Code(String icd10Code, Pageable pageable) {
        return diagnosisRepository.findByIcd10Code(icd10Code, pageable)
                .map(diagnosisMapper::toResponse);
    }
}
