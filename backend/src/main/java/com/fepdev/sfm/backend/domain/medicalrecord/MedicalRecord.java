package com.fepdev.sfm.backend.domain.medicalrecord;

import java.time.OffsetDateTime;
import java.util.Map;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.fepdev.sfm.backend.domain.appointment.Appointment;
import com.fepdev.sfm.backend.domain.patient.Patient;
import com.fepdev.sfm.backend.shared.domain.BaseEntity;

import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


import jakarta.persistence.Column;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;

@Entity
@Table(name = "medical_records")
@Getter
@Setter
@NoArgsConstructor
public class MedicalRecord extends BaseEntity {
    
    // relaciones
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;

    // entidad
    @Column(name = "vital_signs", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> vitalSigns;

    @Column(name = "physical_exam")
    private String physicalExam;

    @Column(name = "clinical_notes", nullable = false)
    private String clinicalNotes;

    @Column(name = "record_date", nullable = false)
    private OffsetDateTime recordDate;
}
