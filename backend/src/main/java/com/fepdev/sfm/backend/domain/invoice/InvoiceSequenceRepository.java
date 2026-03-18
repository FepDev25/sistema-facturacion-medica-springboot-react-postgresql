package com.fepdev.sfm.backend.domain.invoice;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;

// PK es Integer referente a anio
@Repository
public interface InvoiceSequenceRepository extends JpaRepository<InvoiceSequence, Integer> {

    // Bloqueo pesimista: SELECT ... FOR UPDATE
    // Garantiza que solo una transaccion a la vez puede leer+incrementar el contador del año.
    // Cualquier otra transaccion concurrente que intente obtener este lock queda bloqueada hasta que la primera haga commit o rollback.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM InvoiceSequence s WHERE s.year = :year")
    Optional<InvoiceSequence> findByYearForUpdate(@Param("year") Integer year);
}
