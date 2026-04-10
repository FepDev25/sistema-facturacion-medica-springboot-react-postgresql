package com.fepdev.sfm.backend.domain.doctor;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.fepdev.sfm.backend.domain.appointment.Appointment;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, UUID> {

    boolean existsByLicenseNumber(String licenseNumber);
    Optional<Doctor> findByLicenseNumber(String licenseNumber);
    Optional<Doctor> findByUserId(UUID userId);
    boolean existsByUserId(UUID userId);

    // Consulta para obtener la agenda de un doctor, con filtros opcionales de fecha
    @Query("""
        SELECT a FROM Appointment a
        WHERE a.doctor.id = :doctorId
        AND (cast(:startDate as timestamp) IS NULL OR a.scheduledAt >= :startDate)
        AND (cast(:endDate as timestamp) IS NULL OR a.scheduledAt <= :endDate)
        ORDER BY a.scheduledAt ASC""") // Ascendente porque queremos ver las citas más próximas primero
    Page<Appointment> findDoctorAgenda(@Param("doctorId") UUID doctorId, 
                                       @Param("startDate") LocalDateTime startDate, 
                                       @Param("endDate") LocalDateTime endDate, 
                                       Pageable pageable);

    
    // filtro de doctores por activo e especialidad, ambos opcionales
    @Query("""
        SELECT d
        FROM Doctor d
        WHERE (:isActive IS NULL OR d.isActive = :isActive) AND 
              (:specialty = '' OR LOWER(d.specialty) LIKE LOWER(CONCAT('%', :specialty, '%')))""")
    Page<Doctor> findWithFilters(@Param("isActive") Boolean isActive, 
                                    @Param("specialty") String specialty,
                                    Pageable pageable);
}
