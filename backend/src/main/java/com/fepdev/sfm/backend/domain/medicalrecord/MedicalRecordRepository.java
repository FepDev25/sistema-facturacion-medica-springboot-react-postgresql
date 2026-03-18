package com.fepdev.sfm.backend.domain.medicalrecord;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, UUID> {

    // funciona como derived query: Spring Data resuelve appointment -> id automáticamente
    Optional<MedicalRecord> findByAppointmentId(UUID appointmentId);

    // todos los expedientes de un paciente, ordenados por fecha descendente, con paginación
    @Query("""
        SELECT m FROM MedicalRecord m
        WHERE m.patient.id = :patientId
        ORDER BY m.recordDate DESC""")
    Page<MedicalRecord> findByPatientId(@Param("patientId") UUID patientId, Pageable pageable);
}
