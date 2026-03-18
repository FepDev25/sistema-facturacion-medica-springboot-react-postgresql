package com.fepdev.sfm.backend.domain.medicalrecord;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fepdev.sfm.backend.domain.appointment.Appointment;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.ProcedureCreateRequest;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.ProcedureResponse;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@Service
public class ProcedureService {
    
    private final ProcedureRepository procedureRepository;
    private final ProcedureMapper procedureMapper;
    private final MedicalRecordRepository medicalRecordRepository;

    public ProcedureService(ProcedureRepository procedureRepository, ProcedureMapper procedureMapper, MedicalRecordRepository medicalRecordRepository) {
        this.procedureRepository = procedureRepository;
        this.procedureMapper = procedureMapper;
        this.medicalRecordRepository = medicalRecordRepository;
    }

    // agregar procedimiento a un expediente existente
    @Transactional
    public ProcedureResponse createProcedure(ProcedureCreateRequest request) {
        // validar que medicalRecordId existe
        MedicalRecord medicalRecord = medicalRecordRepository.findById(request.medicalRecordId())
                .orElseThrow(() -> new EntityNotFoundException("Expediente con ID: " + request.medicalRecordId() + " no encontrado"));

        // validar que appointmentId y medicalRecordId pertenecen a la misma consulta
        if (!medicalRecord.getAppointment().getId().equals(request.appointmentId())) {
            throw new BusinessRuleException(
                    "El appointment_id y el medical_record_id no pertenecen a la misma consulta");
        }

        Appointment appointment = medicalRecord.getAppointment();
        Procedure procedure = procedureMapper.toEntity(request);
        procedure.setMedicalRecord(medicalRecord);
        procedure.setAppointment(appointment);

        Procedure savedProcedure = procedureRepository.save(procedure);
        return procedureMapper.toResponse(savedProcedure);
    }

    // obtener procedimientos de un expediente con paginación
    @Transactional(readOnly = true)
    public Page<ProcedureResponse> getProceduresByMedicalRecordId(UUID medicalRecordId, Pageable pageable) {
        if (!medicalRecordRepository.existsById(medicalRecordId)) {
            throw new EntityNotFoundException("Expediente con ID: " + medicalRecordId + " no encontrado");
        }

        Page<Procedure> proceduresPage = procedureRepository.findByMedicalRecordId(medicalRecordId, pageable);
        return proceduresPage.map(procedureMapper::toResponse);
    }

}
