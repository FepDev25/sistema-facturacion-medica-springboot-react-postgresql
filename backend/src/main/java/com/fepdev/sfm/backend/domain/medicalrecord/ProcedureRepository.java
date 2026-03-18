package com.fepdev.sfm.backend.domain.medicalrecord;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ProcedureRepository extends JpaRepository<Procedure, UUID> {

    // obtener procedimientos de un expediente con paginación
    @Query("""
        SELECT p FROM Procedure p
        WHERE p.medicalRecord.id = :medicalRecordId
        ORDER BY p.createdAt DESC""")
    Page<Procedure> findByMedicalRecordId(UUID medicalRecordId, Pageable pageable);
}
