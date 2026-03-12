package com.fepdev.sfm.backend.domain.invoice;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.fepdev.sfm.backend.domain.appointment.Appointment;
import com.fepdev.sfm.backend.domain.insurance.InsurancePolicy;
import com.fepdev.sfm.backend.domain.patient.Patient;
import com.fepdev.sfm.backend.shared.domain.BaseEntity;

import jakarta.persistence.FetchType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "invoices")
@Getter
@Setter
@NoArgsConstructor
public class Invoice extends BaseEntity {

    // relaciones
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "insurance_policy_id")
    private InsurancePolicy insurancePolicy;

    // entidad
    @Column(name = "invoice_number", nullable = false, unique = true, length = 50)
    private String invoiceNumber;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal tax;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total;

    @Column(name = "insurance_coverage", nullable = false, precision = 10, scale = 2)
    private BigDecimal insuranceCoverage;

    @Column(name = "patient_responsibility", nullable = false, precision = 10, scale = 2)
    private BigDecimal patientResponsibility;

    @Column(name = "status", nullable = false, length = 20)
    private Status status;

    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

}
