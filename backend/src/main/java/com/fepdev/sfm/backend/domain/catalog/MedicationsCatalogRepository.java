package com.fepdev.sfm.backend.domain.catalog;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicationsCatalogRepository extends JpaRepository<MedicationsCatalog, UUID> {}
