package com.fepdev.sfm.backend.domain.patient;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PatientRepository extends JpaRepository<Patient, UUID> {
    Optional<Patient> findByDni(String dni);
    boolean existsByDni(String dni);

    // listar pacientes con filtro por apellido y paginacion
   @Query("""
        SELECT p
        FROM Patient p
        WHERE (:lastName IS NULL OR LOWER(p.lastName) LIKE LOWER(CONCAT('%', :lastName, '%')))""")
    Page<Patient> findWithFilters(@Param("lastName") String lastName, Pageable pageable);

    // busqueda rapida por nombre, apellido o dni
    @Query("""
        SELECT p 
        FROM Patient p 
        WHERE (:searchTerm IS NULL OR 
               LOWER(p.firstName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR 
               LOWER(p.lastName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR 
               p.dni LIKE CONCAT('%', :searchTerm, '%'))""")
    List<Patient> quickSearch(@Param("searchTerm") String searchTerm, Pageable pageable);
}
