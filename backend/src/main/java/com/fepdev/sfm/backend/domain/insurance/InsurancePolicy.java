package com.fepdev.sfm.backend.domain.insurance;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.fepdev.sfm.backend.domain.patient.Patient;
import com.fepdev.sfm.backend.shared.domain.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "insurance_policies")
@Getter
@Setter
@NoArgsConstructor
public class InsurancePolicy extends BaseEntity{

    // relaciones
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_id", nullable = false)
    private InsuranceProvider provider;

    // entidad

    @Column(name = "policy_number", nullable = false, unique = true, length = 100)
    private String policyNumber;

    @Column(name = "coverage_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal coveragePercentage;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal deductible;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;

}
