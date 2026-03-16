package com.fepdev.sfm.backend.domain.insurance;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface InsurancePolicyRepository extends JpaRepository<InsurancePolicy, UUID> {

    Optional<InsurancePolicy> findByPolicyNumber(String policyNumber);

    // verifica si un proveedor tiene al menos una póliza activa (usado antes de desactivarlo)
    @Query("""
        SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END
        FROM InsurancePolicy p
        WHERE p.provider.id = :providerId AND p.isActive = true""")
    boolean existsActiveByProviderId(@Param("providerId") UUID providerId);

    // obtener las pólizas de un paciente, con opción de filtrar solo las activas o todas, ordenadas por fecha de inicio descendente
    @Query("""
        SELECT p FROM InsurancePolicy p
        WHERE p.patient.id = :patientId 
        AND (:onlyActive IS NULL OR :onlyActive = false OR p.isActive = true)
        ORDER BY p.startDate DESC""")
    Page<InsurancePolicy> findByPatientIdWithFilter(@Param("patientId") UUID patientId, 
                                                    @Param("onlyActive") Boolean onlyActive, 
                                                    Pageable pageable);
}
