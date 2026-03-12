package com.fepdev.sfm.backend.domain.insurance;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface InsurancePolicyRepository extends JpaRepository<InsurancePolicy, UUID> {}
