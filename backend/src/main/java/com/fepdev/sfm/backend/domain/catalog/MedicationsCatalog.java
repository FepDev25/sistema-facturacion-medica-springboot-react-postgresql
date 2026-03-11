package com.fepdev.sfm.backend.domain.catalog;

import java.math.BigDecimal;

import com.fepdev.sfm.backend.shared.domain.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "medications_catalog")
@Getter
@Setter
@NoArgsConstructor
public class MedicationsCatalog extends BaseEntity{

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "unit", nullable = false, length = 50)
    private Unit unit;

    @Column(name = "requires_prescription", nullable = false)
    private boolean requiresPrescription;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;
}
