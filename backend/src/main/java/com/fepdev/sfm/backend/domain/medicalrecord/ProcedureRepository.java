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
public interface ProcedureRepository extends JpaRepository<Procedure, UUID> {

    @Query("SELECT p FROM Procedure p WHERE p.medicalRecord.id = :medicalRecordId ORDER BY p.createdAt DESC")
    Page<Procedure> findByMedicalRecordId(@Param("medicalRecordId") UUID medicalRecordId, Pageable pageable);

    @Query("SELECT p FROM Procedure p WHERE p.medicalRecord.id = :medicalRecordId ORDER BY p.createdAt DESC")
    List<Procedure> findAllByMedicalRecordId(@Param("medicalRecordId") UUID medicalRecordId);

    @Query("SELECT p FROM Procedure p WHERE p.medicalRecord.patient.id = :patientId ORDER BY p.performedAt DESC")
    List<Procedure> findAllByPatientId(@Param("patientId") UUID patientId);
}
