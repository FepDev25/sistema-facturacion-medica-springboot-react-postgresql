package com.fepdev.sfm.backend.domain.appointment;

import java.time.LocalDateTime;

import com.fepdev.sfm.backend.domain.doctor.Doctor;
import com.fepdev.sfm.backend.domain.patient.Patient;
import com.fepdev.sfm.backend.shared.domain.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;


@Entity
@Table(name = "appointments")
@Getter
@Setter
@NoArgsConstructor
public class Appointment extends BaseEntity {
    
    // relaciones
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    // entidad
    @Column(name = "scheduled_at", nullable = false)
    private LocalDateTime scheduledAt;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @Column(nullable = false)
    private Status status;

    @Column(name = "chief_complaint")
    private String chiefComplaint;

    private String notes;

}
