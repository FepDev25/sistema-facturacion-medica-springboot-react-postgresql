package com.fepdev.sfm.backend.domain.medicalrecord;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, UUID> {}
