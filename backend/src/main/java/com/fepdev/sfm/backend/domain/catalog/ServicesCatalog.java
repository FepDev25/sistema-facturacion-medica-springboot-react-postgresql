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
@Table(name = "services_catalog")
@Getter
@Setter
@NoArgsConstructor
public class ServicesCatalog extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "category", nullable = false, length = 100)
    private Category category;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;
    
}
