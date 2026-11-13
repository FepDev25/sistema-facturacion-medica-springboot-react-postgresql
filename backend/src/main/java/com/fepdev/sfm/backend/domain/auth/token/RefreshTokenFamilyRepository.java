package com.fepdev.sfm.backend.domain.auth.token;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RefreshTokenFamilyRepository extends JpaRepository<RefreshTokenFamily, UUID> {}
