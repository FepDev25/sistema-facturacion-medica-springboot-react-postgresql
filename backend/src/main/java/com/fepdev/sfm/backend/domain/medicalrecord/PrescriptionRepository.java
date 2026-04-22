package com.fepdev.sfm.backend.domain.medicalrecord;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, UUID> {

    @Query("""
        SELECT p FROM Prescription p
        WHERE p.medicalRecord.id = :medicalRecordId
        ORDER BY p.createdAt DESC""")
    Page<Prescription> findByMedicalRecordId(UUID medicalRecordId, Pageable pageable);

    @Query("SELECT p FROM Prescription p WHERE p.medicalRecord.id = :medicalRecordId ORDER BY p.createdAt DESC")
    List<Prescription> findAllByMedicalRecordId(@Param("medicalRecordId") UUID medicalRecordId);

    // verificar si existe prescripción para un medicamento en una cita (usado por facturación)
    boolean existsByAppointmentIdAndMedicationId(UUID appointmentId, UUID medicationId);
}
