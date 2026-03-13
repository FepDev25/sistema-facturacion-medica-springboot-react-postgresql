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
}
