package com.fepdev.sfm.backend.domain.insurance;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface InsuranceProviderRepository extends JpaRepository<InsuranceProvider, UUID> {
    boolean existsByCode(String code);

    @Query("""
        SELECT p
        FROM InsuranceProvider p
        WHERE (:isActive IS NULL OR p.active = :isActive)""")
    Page<InsuranceProvider> findWithFilters(@Param("isActive") Boolean isActive, Pageable pageable);
}
