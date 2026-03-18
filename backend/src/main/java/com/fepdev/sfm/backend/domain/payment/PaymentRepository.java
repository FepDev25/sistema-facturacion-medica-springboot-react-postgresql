package com.fepdev.sfm.backend.domain.payment;

import java.math.BigDecimal;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    // usado por InvoiceService
    boolean existsByInvoiceId(UUID invoiceId);

    // listar pagos de una factura ordenados por fecha descendente
    Page<Payment> findByInvoiceIdOrderByPaymentDateDesc(UUID invoiceId, Pageable pageable);

    // sumar todos los pagos existentes de una factura para validar
    // que sa suma de todos los pagos existentes más el nuevo pago no puede exceder el total
    // COALESCE devuelve 0 si no hay pagos todavía
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.invoice.id = :invoiceId")
    BigDecimal sumAmountByInvoiceId(@Param("invoiceId") UUID invoiceId);
}
