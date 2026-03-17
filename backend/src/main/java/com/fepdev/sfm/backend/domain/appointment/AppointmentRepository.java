package com.fepdev.sfm.backend.domain.appointment;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    // historial de citas de un paciente ordenado por fecha descendente, con paginacion
    @Query("""
        SELECT a FROM Appointment a
        WHERE a.patient.id = :patientId
        ORDER BY a.scheduledAt DESC""")
    Page<Appointment> findByPatientId(@Param("patientId") UUID patientId, Pageable pageable);

    // listado general con todos los filtros opcionales (doctor, paciente, rango de fechas, estado)
    @Query("""
        SELECT a FROM Appointment a
        WHERE (:doctorId IS NULL OR a.doctor.id = :doctorId)
        AND (:patientId IS NULL OR a.patient.id = :patientId)
        AND (:status IS NULL OR a.status = :status)
        AND (cast(:startDate as timestamp) IS NULL OR a.scheduledAt >= :startDate)
        AND (cast(:endDate as timestamp) IS NULL OR a.scheduledAt <= :endDate)
        ORDER BY a.scheduledAt DESC""")
    Page<Appointment> findWithFilters(@Param("doctorId") UUID doctorId,
                                      @Param("patientId") UUID patientId,
                                      @Param("status") Status status,
                                      @Param("startDate") OffsetDateTime startDate,
                                      @Param("endDate") OffsetDateTime endDate,
                                      Pageable pageable);

    // citas ocupadas de un médico en un rango, excluye canceladas y no_show para disponibilidad
    @Query("""
        SELECT a FROM Appointment a
        WHERE a.doctor.id = :doctorId
        AND a.status NOT IN :excludedStatuses
        AND a.scheduledAt >= :startDate
        AND a.scheduledAt <= :endDate
        ORDER BY a.scheduledAt ASC""")
    List<Appointment> findActiveByDoctorIdBetween(@Param("doctorId") UUID doctorId,
                                                  @Param("startDate") OffsetDateTime startDate,
                                                  @Param("endDate") OffsetDateTime endDate,
                                                  @Param("excludedStatuses") List<Status> excludedStatuses);

    // overlap real entre intervalos: [newStart, newEnd) ∩ [a.scheduledAt, a.scheduledEndAt) ≠ ∅
    // condición: newStart < a.scheduledEndAt AND newEnd > a.scheduledAt
    // excluye cancelled y no_show porque no ocupan agenda
    @Query("""
        SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END
        FROM Appointment a
        WHERE a.doctor.id = :doctorId
        AND a.status NOT IN :excludedStatuses
        AND a.scheduledAt < :endTime
        AND a.scheduledEndAt > :startTime""")
    boolean hasScheduleConflict(@Param("doctorId") UUID doctorId,
                                @Param("startTime") OffsetDateTime startTime,
                                @Param("endTime") OffsetDateTime endTime,
                                @Param("excludedStatuses") List<Status> excludedStatuses);
}
