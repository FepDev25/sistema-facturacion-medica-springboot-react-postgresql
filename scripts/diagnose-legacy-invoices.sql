-- Diagnostico previo a V13 (solo lectura).
-- Ejecutar contra produccion antes de desplegar la migracion y guardar el resultado.
SELECT
    i.invoice_number,
    i.status,
    i.total,
    i.insurance_coverage,
    i.patient_responsibility,
    COALESCE(SUM(p.amount), 0) AS paid_amount
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.id
WHERE i.status IN ('pending', 'partial_paid', 'overdue')
GROUP BY i.id, i.invoice_number, i.status, i.total, i.insurance_coverage,
         i.patient_responsibility
HAVING i.patient_responsibility = 0
    OR COALESCE(SUM(p.amount), 0) >= i.patient_responsibility
ORDER BY i.invoice_number;
