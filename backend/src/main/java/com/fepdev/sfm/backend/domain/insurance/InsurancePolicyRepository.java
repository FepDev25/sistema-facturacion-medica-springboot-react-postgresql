package com.fepdev.sfm.backend.domain.insurance;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InsurancePolicyRepository extends JpaRepository<InsurancePolicy, UUID> {

    // todas las pólizas de un paciente (sin paginar: un paciente tiene pocas pólizas)
    @Query("""
        SELECT p FROM InsurancePolicy p
        WHERE p.patient.id = :patientId
        ORDER BY p.startDate DESC""")
    List<InsurancePolicy> findByPatientId(@Param("patientId") UUID patientId);

    // solo pólizas activas de un paciente
    @Query("""
        SELECT p FROM InsurancePolicy p
        WHERE p.patient.id = :patientId AND p.isActive = true
        ORDER BY p.startDate DESC""")
    List<InsurancePolicy> findActiveByPatientId(@Param("patientId") UUID patientId);
}
