package com.fepdev.sfm.backend.domain.invoice;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InvoiceItemRepository extends JpaRepository<InvoiceItem, UUID> {

    // Método personalizado para obtener los items de una factura por su ID
    List<InvoiceItem> findByInvoiceId(UUID invoiceId);
}
