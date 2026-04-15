package com.fepdev.sfm.backend.domain.invoice;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceListViewResponse;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);

    Optional<Invoice> findTopByAppointmentIdOrderByCreatedAtDesc(UUID appointmentId);

    @EntityGraph(attributePaths = {
            "patient",
            "appointment",
            "insurancePolicy",
            "insurancePolicy.provider"
    })
    @Query("SELECT i FROM Invoice i WHERE i.id = :id")
    Optional<Invoice> findViewById(@Param("id") UUID id);

    // Filtros todos opcionales: pasar null para ignorar ese filtro.
    // issueDate se usa para el rango de fechas.
    @Query("""
            SELECT i FROM Invoice i
            WHERE (:patientId IS NULL OR i.patient.id = :patientId)
              AND (:status    IS NULL OR i.status = :status)
              AND (cast(:startDate as date) IS NULL OR i.issueDate >= :startDate)
              AND (cast(:endDate as date) IS NULL OR i.issueDate <= :endDate)
            ORDER BY i.issueDate DESC
            """)
    Page<Invoice> findWithFilters(
            @Param("patientId") UUID patientId,
            @Param("status") InvoiceStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable);

    @Query("""
            SELECT new com.fepdev.sfm.backend.domain.invoice.dto.InvoiceListViewResponse(
              i.id,
              p.id,
              p.firstName,
              p.lastName,
              i.invoiceNumber,
              i.total,
              i.patientResponsibility,
              i.status,
              i.issueDate,
              i.dueDate,
              i.createdAt
            )
            FROM Invoice i
            JOIN i.patient p
            WHERE (:patientId IS NULL OR p.id = :patientId)
              AND (:status IS NULL OR i.status = :status)
              AND (cast(:startDate as date) IS NULL OR i.issueDate >= :startDate)
              AND (cast(:endDate as date) IS NULL OR i.issueDate <= :endDate)
            ORDER BY i.issueDate DESC
            """)
    Page<InvoiceListViewResponse> findListViewWithFilters(
            @Param("patientId") UUID patientId,
            @Param("status") InvoiceStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable);
}
