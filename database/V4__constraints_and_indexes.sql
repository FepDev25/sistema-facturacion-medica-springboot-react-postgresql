-- ============================================================================
-- V4__constraints_and_indexes.sql
-- ============================================================================
-- Constraints adicionales, correcciones y optimizaciones de índices.
-- Corresponde al contenido de 03_audit_fixes.sql, excluyendo todo lo
-- relacionado con funciones y triggers (lógica gestionada por la aplicación).
-- ============================================================================

-- ============================================================================
-- Tabla de secuencias para generación de números de factura (RN race-condition)
-- La generación del número FAC-YYYY-NNNNN se implementa en Java usando
-- SELECT ... FOR UPDATE sobre esta tabla dentro de la transacción.
-- ============================================================================

CREATE TABLE invoice_sequences (
    year INTEGER PRIMARY KEY,
    last_sequence INTEGER NOT NULL DEFAULT 0
);

COMMENT ON TABLE invoice_sequences IS 'Secuencias de facturación por año. Usada por la capa de aplicación con bloqueo pesimista para evitar race conditions.';

-- ============================================================================
-- Unicidad de expediente clínico por cita (RN-05)
-- Una consulta genera exactamente un expediente clínico.
-- ============================================================================

ALTER TABLE medical_records
ADD CONSTRAINT uq_medical_records_appointment UNIQUE (appointment_id);

COMMENT ON CONSTRAINT uq_medical_records_appointment ON medical_records IS 'RN-05: Una consulta genera exactamente un expediente clínico';

-- ============================================================================
-- Corrección del constraint de suma de responsabilidades en facturas (RN-11/12)
-- Tolerancia de $0.01 para evitar falsos positivos por redondeo numérico.
-- ============================================================================

ALTER TABLE invoices DROP CONSTRAINT chk_invoices_responsibility_sum;

ALTER TABLE invoices
ADD CONSTRAINT chk_invoices_responsibility_sum CHECK (
    ABS((insurance_coverage + patient_responsibility) - total) < 0.01
);

COMMENT ON CONSTRAINT chk_invoices_responsibility_sum ON invoices IS 'Valida que insurance_coverage + patient_responsibility = total (tolerancia $0.01 por redondeo)';

-- ============================================================================
-- Columna scheduled_end_at en appointments
-- ============================================================================
-- El operador timestamptz + interval es STABLE en PostgreSQL (no IMMUTABLE)
-- porque depende del timezone de sesión para calcular transiciones DST.
-- Esto impide usarlo en expresiones de índice o exclusion constraints.
-- La solución es almacenar el tiempo de fin calculado por la aplicación.
-- La capa de servicio (AppointmentService) calcula y persiste este valor
-- al crear o actualizar una cita.
-- ============================================================================

ALTER TABLE appointments
ADD COLUMN scheduled_end_at TIMESTAMPTZ;

COMMENT ON COLUMN appointments.scheduled_end_at IS 'Tiempo de fin de la cita. Calculado por la aplicación como scheduled_at + duration_minutes. Requerido para detección de solapamientos.';

-- ============================================================================
-- Extensión btree_gist para futuros exclusion constraints
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

COMMENT ON EXTENSION btree_gist IS 'Habilitada para uso futuro con exclusion constraints. La validación de solapamiento de citas se implementa en la capa de aplicación (AppointmentService).';

-- ============================================================================
-- Índice de soporte para la validación de solapamiento de citas (RN-03)
-- La validación de solapamiento se implementa en AppointmentService usando
-- una query contra estos índices. El exclusion constraint requeriría que
-- scheduled_end_at sea NOT NULL, lo cual se garantizará en una migración
-- posterior una vez que la columna esté completamente poblada.
-- ============================================================================

CREATE INDEX idx_appointments_doctor_schedule
ON appointments(doctor_id, scheduled_at, scheduled_end_at)
WHERE status NOT IN ('cancelled', 'no_show');

-- ============================================================================
-- appointment_id opcional en facturas
-- Permite facturar servicios de emergencia sin cita previa registrada.
-- ============================================================================

ALTER TABLE invoices ALTER COLUMN appointment_id DROP NOT NULL;

ALTER TABLE invoices
ADD COLUMN notes TEXT;

ALTER TABLE invoices
ADD CONSTRAINT chk_invoices_requires_reference CHECK (
    appointment_id IS NOT NULL OR notes IS NOT NULL
);

COMMENT ON CONSTRAINT chk_invoices_requires_reference ON invoices IS 'Una factura debe tener cita asociada o notas que expliquen la ausencia de cita';
COMMENT ON COLUMN invoices.notes IS 'Notas de la factura. Obligatorio si no tiene cita asociada.';

-- ============================================================================
-- Índices adicionales de performance
-- ============================================================================

CREATE INDEX idx_appointments_patient_scheduled ON appointments(patient_id, scheduled_at);
CREATE INDEX idx_diagnoses_icd10_patient ON diagnoses(icd10_code, diagnosed_at);
CREATE INDEX idx_catalog_price_history_type_id ON catalog_price_history(catalog_type, catalog_id);

-- Índice full-text para búsqueda de alergias (crítico para validación de prescripciones)
-- Nota: se usa 'spanish'::regconfig (no 'spanish'::text) para que PostgreSQL
-- resuelva la sobrecarga IMMUTABLE de to_tsvector(regconfig, text).
-- La variante to_tsvector(text, text) es STABLE y no puede usarse en índices.
CREATE INDEX idx_patients_allergies_gin
ON patients USING GIN(to_tsvector('spanish'::regconfig, COALESCE(allergies, '')))
WHERE allergies IS NOT NULL;

-- Índices full-text para búsqueda en catálogos
CREATE INDEX idx_medications_name_gin
ON medications_catalog USING GIN(to_tsvector('spanish'::regconfig, name));

CREATE INDEX idx_services_name_gin
ON services_catalog USING GIN(to_tsvector('spanish'::regconfig, name));

COMMENT ON INDEX idx_patients_allergies_gin IS 'Índice full-text para búsqueda rápida de alergias de pacientes';
COMMENT ON INDEX idx_medications_name_gin IS 'Índice full-text para búsqueda de medicamentos por nombre';
COMMENT ON INDEX idx_services_name_gin IS 'Índice full-text para búsqueda de servicios por nombre';
