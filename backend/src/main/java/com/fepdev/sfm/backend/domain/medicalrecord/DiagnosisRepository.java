package com.fepdev.sfm.backend.domain.medicalrecord;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DiagnosisRepository extends JpaRepository<Diagnosis, UUID> {}
