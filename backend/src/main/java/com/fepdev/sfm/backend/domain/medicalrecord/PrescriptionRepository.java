package com.fepdev.sfm.backend.domain.medicalrecord;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PrescriptionRepository extends JpaRepository<Prescription, UUID> {}
