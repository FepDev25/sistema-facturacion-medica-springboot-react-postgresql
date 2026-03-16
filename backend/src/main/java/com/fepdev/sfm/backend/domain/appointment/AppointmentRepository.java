package com.fepdev.sfm.backend.domain.appointment;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    // historial de citas de un paciente ordenado por fecha descendente, con paginacion
    @Query("""
        SELECT a FROM Appointment a
        WHERE a.patient.id = :patientId
        ORDER BY a.scheduledAt DESC""")
    Page<Appointment> findByPatientId(@Param("patientId") UUID patientId, Pageable pageable);

    // historial de citas de un doctor ordenado por fecha descendente, con paginacion
    @Query("""
        SELECT a FROM Appointment a
        WHERE a.doctor.id = :doctorId
        ORDER BY a.scheduledAt DESC""")
    Page<Appointment> findByDoctorId(@Param("doctorId") UUID doctorId, Pageable pageable);


    // consulta para obtener la agenda de un doctor, con filtros opcionales de fecha
    @Query("""
        SELECT a FROM Appointment a
        WHERE a.doctor.id = :doctorId
        AND (cast(:startDate as timestamp) IS NULL OR a.scheduledAt >= :startDate)
        AND (cast(:endDate as timestamp) IS NULL OR a.scheduledAt <= :endDate)
        ORDER BY a.scheduledAt ASC""") // Ascendente porque queremos ver las citas más próximas primero
    Page<Appointment> findDoctorAgenda(@Param("doctorId") UUID doctorId, 
                                       @Param("startDate") java.time.LocalDateTime startDate, 
                                       @Param("endDate") java.time.LocalDateTime endDate, 
                                       Pageable pageable);

}
