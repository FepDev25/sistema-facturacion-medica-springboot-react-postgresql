package com.fepdev.sfm.backend.domain.catalog;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CatalogPriceHistoryRepository extends JpaRepository<CatalogPriceHistory, UUID> {}
