package com.fepdev.sfm.backend.domain.invoice;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);

    // Filtros todos opcionales: pasar null para ignorar ese filtro.
    // issueDate se usa para el rango de fechas.
    @Query("""
            SELECT i FROM Invoice i
            WHERE (:patientId IS NULL OR i.patient.id = :patientId)
              AND (:status    IS NULL OR i.status = :status)
              AND (:startDate IS NULL OR i.issueDate >= :startDate)
              AND (:endDate   IS NULL OR i.issueDate <= :endDate)
            ORDER BY i.issueDate DESC
            """)
    Page<Invoice> findWithFilters(
            @Param("patientId") UUID patientId,
            @Param("status") InvoiceStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable);
}
