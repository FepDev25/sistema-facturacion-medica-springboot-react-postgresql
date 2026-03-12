package com.fepdev.sfm.backend.domain.insurance;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface InsuranceProviderRepository extends JpaRepository<InsuranceProvider, UUID> {}
