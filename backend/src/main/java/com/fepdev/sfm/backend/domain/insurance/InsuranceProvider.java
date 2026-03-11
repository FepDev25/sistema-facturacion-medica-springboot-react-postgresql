package com.fepdev.sfm.backend.domain.insurance;

import com.fepdev.sfm.backend.shared.domain.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "insurance_providers")
@Getter
@Setter
@NoArgsConstructor
public class InsuranceProvider extends BaseEntity{

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 50, unique = true)
    private String code;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(length = 100)
    private String email;

    @Column(length = 255)
    private String address;

    @Column(nullable = false)
    private boolean isActive;

}
