package com.fepdev.sfm.backend.domain.invoice;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Tabla usada por InvoiceService para generar numeros FAC-YYYY-NNNNN.
// El servicio aplica SELECT ... FOR UPDATE sobre esta entidad para evitar race conditions.
// La PK es el anio (no UUID), por eso no extiende BaseEntity.
@Entity
@Table(name = "invoice_sequences")
@Getter
@Setter
@NoArgsConstructor
public class InvoiceSequence {

    @Id
    @Column(nullable = false, updatable = false)
    private Integer year;

    @Column(name = "last_sequence", nullable = false)
    private Integer lastSequence;
}
