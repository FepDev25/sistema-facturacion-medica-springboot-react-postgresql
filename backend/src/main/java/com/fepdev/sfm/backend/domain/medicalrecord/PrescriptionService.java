package com.fepdev.sfm.backend.domain.medicalrecord;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fepdev.sfm.backend.ai.history.PatientHistoryIndexer;
import com.fepdev.sfm.backend.domain.appointment.Appointment;
import com.fepdev.sfm.backend.domain.appointment.Status;
import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalog;
import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalogRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.PrescriptionCreateRequest;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.PrescriptionResponse;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@Service
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionMapper prescriptionMapper;
    private final MedicalRecordRepository medicalRecordRepository;
    private final MedicationsCatalogRepository medicationRepository;
    private final PatientHistoryIndexer historyIndexer;

    public PrescriptionService(PrescriptionRepository prescriptionRepository, PrescriptionMapper prescriptionMapper,
            MedicalRecordRepository medicalRecordRepository, MedicationsCatalogRepository medicationRepository,
            PatientHistoryIndexer historyIndexer) {
        this.prescriptionRepository = prescriptionRepository;
        this.prescriptionMapper = prescriptionMapper;
        this.medicalRecordRepository = medicalRecordRepository;
        this.medicationRepository = medicationRepository;
        this.historyIndexer = historyIndexer;
    }

    // agregar prescripción a un expediente existente
    @Transactional
    public PrescriptionResponse createPrescription(PrescriptionCreateRequest request) {

        MedicalRecord medicalRecord = medicalRecordRepository.findById(request.medicalRecordId())
                .orElseThrow(() -> new EntityNotFoundException("Expediente con ID: " + request.medicalRecordId() + " no encontrado"));

        // validar que appointmentId y medicalRecordId pertenecen a la misma consulta
        if (!medicalRecord.getAppointment().getId().equals(request.appointmentId())) {
            throw new BusinessRuleException(
                    "El appointment_id y el medical_record_id no pertenecen a la misma consulta");
        }

        Appointment appointment = medicalRecord.getAppointment();

        // solo se pueden agregar prescripciones a citas en progreso o completadas
        if (appointment.getStatus() != Status.IN_PROGRESS && appointment.getStatus() != Status.COMPLETED) {
            throw new BusinessRuleException(
                    "Solo se pueden agregar prescripciones a citas en estado IN_PROGRESS o COMPLETED. Estado actual: "
                            + appointment.getStatus());
        }

        MedicationsCatalog medication = medicationRepository.findById(request.medicationId())
                .orElseThrow(() -> new EntityNotFoundException("Medicamento con ID: " + request.medicationId() + " no encontrado"));

        Prescription prescription = prescriptionMapper.toEntity(request);
        prescription.setMedicalRecord(medicalRecord);
        prescription.setAppointment(appointment);
        prescription.setMedication(medication);

        PrescriptionResponse response = prescriptionMapper.toResponse(prescriptionRepository.save(prescription));
        historyIndexer.scheduleReindex(medicalRecord.getId());
        return response;
    }

    // listar prescripciones de un expediente clínico
    @Transactional(readOnly = true)
    public Page<PrescriptionResponse> getPrescriptionsByMedicalRecord(UUID medicalRecordId, Pageable pageable) {
        if (!medicalRecordRepository.existsById(medicalRecordId)) {
            throw new EntityNotFoundException("Expediente con ID: " + medicalRecordId + " no encontrado");
        }
        return prescriptionRepository.findByMedicalRecordId(medicalRecordId, pageable)
                .map(prescriptionMapper::toResponse);
    }

    // verificar si existe una prescripción válida para un medicamento en una cita
    // usado por facturación para validar que el medicamento tiene receta antes de facturar
    @Transactional(readOnly = true)
    public boolean hasPrescriptionForMedication(UUID appointmentId, UUID medicationId) {
        return prescriptionRepository.existsByAppointmentIdAndMedicationId(appointmentId, medicationId);
    }
}
