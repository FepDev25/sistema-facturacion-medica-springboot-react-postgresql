package com.fepdev.sfm.backend.security;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SystemUserRepository extends JpaRepository<SystemUser, UUID> {

    Optional<SystemUser> findByUsername(String username);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    Optional<SystemUser> findByDoctorId(UUID doctorId);

    @Query("""
        SELECT su FROM SystemUser su
        WHERE (:role IS NULL OR su.role = :role)
        AND (:active IS NULL OR su.active = :active)
        ORDER BY su.username ASC
        """)
    Page<SystemUser> findWithFilters(@Param("role") Role role, @Param("active") Boolean active, Pageable pageable);
}
