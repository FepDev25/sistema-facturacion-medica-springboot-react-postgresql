-- ============================================================================
-- V13 - Reconciliacion de facturas legacy tras el fix de pagos
-- ============================================================================
-- Antes del fix, el pago se validaba contra `total` en lugar de
-- `patient_responsibility`. Eso pudo dejar:
--   a) facturas al 100 % de cobertura (responsabilidad 0) en pending/partial_paid;
--   b) facturas cuya suma de pagos ya cubre la responsabilidad pero siguen abiertas.
-- La migracion es idempotente: una segunda ejecucion no encuentra filas.
-- ============================================================================

WITH reconciled AS (
    SELECT i.id
    FROM invoices i
    LEFT JOIN payments p ON p.invoice_id = i.id
    WHERE i.status IN ('pending', 'partial_paid', 'overdue')
    GROUP BY i.id, i.patient_responsibility
    HAVING i.patient_responsibility = 0
        OR COALESCE(SUM(p.amount), 0) >= i.patient_responsibility
)
UPDATE invoices i
SET status = 'paid',
    updated_at = now()
WHERE i.id IN (SELECT id FROM reconciled);

COMMENT ON TABLE invoices IS
    'Facturas medicas. RN-09: se genera al completar cita. RN-11: total=subtotal+tax. RN-12: se divide entre seguro y paciente. V13 reconcilia facturas legacy ya cubiertas.';
