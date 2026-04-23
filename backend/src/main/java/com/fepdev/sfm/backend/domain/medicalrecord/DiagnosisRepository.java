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
public interface DiagnosisRepository extends JpaRepository<Diagnosis, UUID> {

    Page<Diagnosis> findByMedicalRecordId(UUID medicalRecordId, Pageable pageable);

    List<Diagnosis> findByMedicalRecordId(UUID medicalRecordId);

    Page<Diagnosis> findByIcd10Code(String icd10Code, Pageable pageable);

    @Query("SELECT d FROM Diagnosis d WHERE d.medicalRecord.patient.id = :patientId ORDER BY d.icd10Code ASC")
    List<Diagnosis> findAllByPatientId(@Param("patientId") UUID patientId);
}
