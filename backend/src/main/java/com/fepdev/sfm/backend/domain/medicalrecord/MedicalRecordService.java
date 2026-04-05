package com.fepdev.sfm.backend.domain.medicalrecord;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fepdev.sfm.backend.domain.medicalrecord.dto.MedicalRecordResponse;
import com.fepdev.sfm.backend.domain.patient.PatientRepository;

import jakarta.persistence.EntityNotFoundException;

@Service
public class MedicalRecordService {
    
    private final MedicalRecordRepository medicalRecordRepository;
    private final MedicalRecordMapper medicalRecordMapper;
    private final PatientRepository patientRepository;

    public MedicalRecordService(MedicalRecordRepository medicalRecordRepository,
            MedicalRecordMapper medicalRecordMapper,
            PatientRepository patientRepository) {
        this.medicalRecordRepository = medicalRecordRepository;
        this.medicalRecordMapper = medicalRecordMapper;
        this.patientRepository = patientRepository;
    }

    // obtener un registro médico por su id
    @Transactional(readOnly = true)
    public MedicalRecordResponse getMedicalRecordById(UUID id) {
        MedicalRecord medicalRecord = medicalRecordRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("No se encontró el registro médico con id: " + id));
        return medicalRecordMapper.toResponse(medicalRecord);
    }

    // obtener un registro médico por el id de la cita
    @Transactional(readOnly = true)
    public MedicalRecordResponse getMedicalRecordByAppointmentId(UUID appointmentId) {
        MedicalRecord medicalRecord = medicalRecordRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new EntityNotFoundException("No se encontró el registro médico para el id de cita: " + appointmentId));
        return medicalRecordMapper.toResponse(medicalRecord);
    }

    // obtener todos los registros médicos de un paciente, con paginación
    @Transactional(readOnly = true)
    public Page<MedicalRecordResponse> getMedicalRecordsByPatientId(UUID patientId, Pageable pageable) {
        if (!patientRepository.existsById(patientId)) {
            throw new EntityNotFoundException("No se encontró el paciente con id: " + patientId);
        }

        Page<MedicalRecord> medicalRecordsPage = medicalRecordRepository.findByPatientId(patientId, pageable);
        return medicalRecordsPage.map(medicalRecordMapper::toResponse);
    }

}
