package com.fepdev.sfm.backend.domain.invoice;

import org.springframework.data.jpa.repository.JpaRepository;

// PK es Integer (año), no UUID
public interface InvoiceSequenceRepository extends JpaRepository<InvoiceSequence, Integer> {}
